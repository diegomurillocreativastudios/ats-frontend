import { describe, expect, it, vi } from "vitest"

import {
  ACTIVITY_FILL_MAX_DAYS,
  buildAssessmentsDashboardQuery,
  fillActivitySeries,
  normalizeAssessmentsDashboard,
} from "@/lib/api/recruiter-assessments-dashboard"

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

function samplePayload(overrides: Record<string, unknown> = {}) {
  return {
    generatedAtUtc: "2026-10-14T12:00:00Z",
    appliedFilters: {
      clientId: null,
      vacancyId: null,
      category: null,
      status: null,
      assignedFromUtc: null,
      assignedToUtc: null,
    },
    kpis: {
      assigned: 10,
      pending: 2,
      inProgress: 1,
      completed: 4,
      expired: 1,
      cancelled: 2,
      pendingManualReview: 1,
    },
    assignmentsPerDay: [
      { dayUtc: "2026-10-01", count: 2 },
      { dayUtc: "2026-10-03", count: 1 },
    ],
    statusDistribution: [
      { status: "Pending", count: 2 },
      { status: "InProgress", count: 1 },
      { status: "Completed", count: 4 },
      { status: "Expired", count: 1 },
      { status: "Cancelled", count: 2 },
    ],
    needsAttention: {
      dueSoon: [
        {
          assignmentId: "a-due",
          applicationId: "app-1",
          candidateName: "Ana",
          vacancyId: "v-1",
          vacancyTitle: "Dev",
          assessmentTitle: "JS Basics",
          category: "Technical",
          status: "Pending",
          expiresAtUtc: "2026-10-20T00:00:00Z",
          assignedAtUtc: "2026-10-01T10:00:00Z",
        },
        {
          assignmentId: "a-due-null",
          applicationId: "app-2",
          candidateName: "Luis",
          vacancyId: "v-1",
          vacancyTitle: "Dev",
          assessmentTitle: "Logic",
          category: "Technical",
          status: "InProgress",
          expiresAtUtc: null,
          assignedAtUtc: "2026-10-02T10:00:00Z",
        },
      ],
      pendingManualReview: [
        {
          assignmentId: "a-review",
          applicationId: "app-3",
          candidateName: "Mia",
          vacancyId: "v-2",
          vacancyTitle: "QA",
          assessmentTitle: "Open essay",
          category: "Technical",
          status: "PendingManualReview",
          expiresAtUtc: null,
          assignedAtUtc: "2026-10-03T10:00:00Z",
        },
      ],
    },
    recentActivity: [
      {
        assignmentId: "a-done",
        applicationId: "app-4",
        candidateName: "Sofia",
        vacancyId: "v-1",
        vacancyTitle: "Dev",
        assessmentTitle: "Psych",
        category: "Psychometric",
        status: "Completed",
        expiresAtUtc: null,
        assignedAtUtc: "2026-10-04T10:00:00Z",
      },
      {
        assignmentId: "a-review-act",
        applicationId: "app-5",
        candidateName: "Mia",
        vacancyId: "v-2",
        vacancyTitle: "QA",
        assessmentTitle: "Open essay",
        category: "Technical",
        status: "PendingManualReview",
        expiresAtUtc: null,
        assignedAtUtc: "2026-10-03T10:00:00Z",
      },
    ],
    ...overrides,
  }
}

describe("buildAssessmentsDashboardQuery", () => {
  it("omits empty filters", () => {
    expect(buildAssessmentsDashboardQuery({})).toBe("")
    expect(
      buildAssessmentsDashboardQuery({
        companyId: null,
        vacancyId: "",
        kind: null,
      }),
    ).toBe("")
  })

  it("maps UI filters to API query params", () => {
    const qs = buildAssessmentsDashboardQuery({
      companyId: "client-1",
      vacancyId: "vac-1",
      kind: "technical",
      assignmentStatus: "pending_manual_review",
      assignedFrom: "2026-10-01",
      assignedTo: "2026-10-14",
    })
    const params = new URLSearchParams(qs.slice(1))
    expect(params.get("clientId")).toBe("client-1")
    expect(params.get("vacancyId")).toBe("vac-1")
    expect(params.get("category")).toBe("Technical")
    expect(params.get("status")).toBe("PendingManualReview")
    expect(params.get("assignedFromUtc")).toBe("2026-10-01T00:00:00Z")
    expect(params.get("assignedToUtc")).toBe("2026-10-14T23:59:59Z")
  })

  it("maps snake_case UI statuses to PascalCase API statuses", () => {
    expect(
      buildAssessmentsDashboardQuery({ assignmentStatus: "in_progress" }),
    ).toBe("?status=InProgress")
    expect(
      buildAssessmentsDashboardQuery({ kind: "psychometric" }),
    ).toBe("?category=Psychometric")
  })
})

describe("fillActivitySeries", () => {
  it("keeps sparse series when either date bound is missing", () => {
    expect(
      fillActivitySeries(
        [{ date: "2026-10-03", count: 1 }],
        "2026-10-01",
        null,
      ),
    ).toEqual([{ date: "2026-10-03", count: 1 }])
  })

  it("fills empty days when inclusive span is within the max", () => {
    const filled = fillActivitySeries(
      [
        { date: "2026-10-01", count: 2 },
        { date: "2026-10-03", count: 1 },
      ],
      "2026-10-01",
      "2026-10-03",
    )
    expect(filled).toEqual([
      { date: "2026-10-01", count: 2 },
      { date: "2026-10-02", count: 0 },
      { date: "2026-10-03", count: 1 },
    ])
  })

  it("does not fill when span exceeds the max", () => {
    const from = "2026-01-01"
    const toMs =
      Date.parse(`${from}T00:00:00.000Z`) +
      ACTIVITY_FILL_MAX_DAYS * 24 * 60 * 60 * 1000
    const to = new Date(toMs).toISOString().slice(0, 10)
    const sparse = [{ date: from, count: 1 }]
    expect(fillActivitySeries(sparse, from, to)).toEqual(sparse)
  })
})

describe("normalizeAssessmentsDashboard", () => {
  it("maps kpis, donut without pendingManualReview, and list hrefs", () => {
    const view = normalizeAssessmentsDashboard(samplePayload())

    expect(view.counts).toEqual({
      assigned: 10,
      pending: 2,
      inProgress: 1,
      completed: 4,
      expired: 1,
      cancelled: 2,
      pendingReview: 1,
    })
    expect(view.statusDistribution).toEqual([
      { status: "pending", count: 2 },
      { status: "in_progress", count: 1 },
      { status: "completed", count: 4 },
      { status: "expired", count: 1 },
      { status: "cancelled", count: 2 },
    ])
    expect(view.statusDistribution.some((s) => (s as { status: string }).status === "pending_manual_review")).toBe(false)
    expect(view.dueSoon[0]?.href).toBe("/portal-pruebas/seguimiento")
    expect(view.dueSoon[0]?.testTitle).toBe("JS Basics")
    expect(view.dueSoon[1]?.expiresAt).toBeNull()
    expect(view.pendingReviews[0]?.href).toBe("/portal-pruebas/revision")
    expect(view.recentActivity[0]?.href).toBe("/portal-pruebas/resultados")
    expect(view.recentActivity[1]?.href).toBe("/portal-pruebas/revision")
    expect(view.isEmpty).toBe(false)
    expect(view.isFilterEmpty).toBe(false)
  })

  it("zeros missing donut slices and marks empty states", () => {
    const empty = normalizeAssessmentsDashboard({
      kpis: { assigned: 0 },
      statusDistribution: [],
      assignmentsPerDay: [],
      needsAttention: { dueSoon: [], pendingManualReview: [] },
      recentActivity: [],
    })
    expect(empty.isEmpty).toBe(true)
    expect(empty.statusDistribution.every((s) => s.count === 0)).toBe(true)

    const filteredEmpty = normalizeAssessmentsDashboard(
      {
        kpis: { assigned: 0 },
        statusDistribution: [],
        assignmentsPerDay: [],
        needsAttention: { dueSoon: [], pendingManualReview: [] },
        recentActivity: [],
      },
      { kind: "technical" },
    )
    expect(filteredEmpty.isEmpty).toBe(false)
    expect(filteredEmpty.isFilterEmpty).toBe(true)
  })

  it("fills activity series from filters when span allows", () => {
    const view = normalizeAssessmentsDashboard(samplePayload(), {
      assignedFrom: "2026-10-01",
      assignedTo: "2026-10-03",
    })
    expect(view.activitySeries).toEqual([
      { date: "2026-10-01", count: 2 },
      { date: "2026-10-02", count: 0 },
      { date: "2026-10-03", count: 1 },
    ])
  })
})
