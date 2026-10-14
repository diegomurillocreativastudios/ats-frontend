import { afterEach, describe, expect, it } from "vitest"

import { buildDashboard } from "@/lib/pruebas/dashboard"
import { createMockFixtures, MOCK_IDS, MOCK_NOW } from "@/lib/pruebas/mock-fixtures"
import {
  getDashboard,
  resetMockStore,
  setMockScenario,
} from "@/lib/pruebas/mock-service"
import { emptyStoreSnapshot } from "@/lib/pruebas/mock-store"

afterEach(() => {
  resetMockStore()
})

describe("buildDashboard", () => {
  it("counts seed assignments without filters", () => {
    const snapshot = buildDashboard(createMockFixtures(), {}, MOCK_NOW)

    expect(snapshot.isStoreEmpty).toBe(false)
    expect(snapshot.isFilterEmpty).toBe(false)
    expect(snapshot.counts).toEqual({
      assigned: 8,
      pending: 2,
      inProgress: 1,
      completed: 3,
      expired: 1,
      pendingReview: 1,
    })
    expect(snapshot.dueSoon.map((item) => item.assignmentId)).toEqual([
      MOCK_IDS.assignmentMariaDup,
    ])
    expect(snapshot.pendingReviews.map((item) => item.assignmentId)).toEqual([
      MOCK_IDS.assignmentDiegoPendingReview,
    ])
    expect(snapshot.activitySeries).toEqual([
      { date: "2026-09-20", count: 1 },
      { date: "2026-09-25", count: 1 },
      { date: "2026-10-01", count: 1 },
      { date: "2026-10-05", count: 1 },
      { date: "2026-10-08", count: 1 },
      { date: "2026-10-10", count: 1 },
      { date: "2026-10-11", count: 1 },
      { date: "2026-10-12", count: 1 },
    ])
    expect(snapshot.statusDistribution).toEqual(
      expect.arrayContaining([
        { status: "pending", count: 2 },
        { status: "in_progress", count: 1 },
        { status: "completed", count: 3 },
        { status: "expired", count: 1 },
        { status: "cancelled", count: 1 },
      ]),
    )
  })

  it("filters psychometric category to one completed assignment", () => {
    const snapshot = buildDashboard(
      createMockFixtures(),
      { kind: "psychometric" },
      MOCK_NOW,
    )

    expect(snapshot.counts).toEqual({
      assigned: 1,
      pending: 0,
      inProgress: 0,
      completed: 1,
      expired: 0,
      pendingReview: 0,
    })
    expect(snapshot.recentActivity).toHaveLength(1)
    expect(snapshot.recentActivity[0]?.assignmentId).toBe(
      MOCK_IDS.assignmentSofiaPending,
    )
    expect(snapshot.recentActivity[0]?.href).toBe(
      "/portal-pruebas/resultados",
    )
  })

  it("marks filter-empty when filters match nothing", () => {
    const snapshot = buildDashboard(
      createMockFixtures(),
      { companyId: "missing-company" },
      MOCK_NOW,
    )

    expect(snapshot.isFilterEmpty).toBe(true)
    expect(snapshot.counts.assigned).toBe(0)
    expect(snapshot.isStoreEmpty).toBe(false)
  })

  it("marks store empty for empty snapshot", () => {
    const snapshot = buildDashboard(emptyStoreSnapshot(), {}, MOCK_NOW)
    expect(snapshot.isStoreEmpty).toBe(true)
    expect(snapshot.counts.assigned).toBe(0)
  })
})

describe("getDashboard", () => {
  it("applies scenario gate and returns seed counts", async () => {
    setMockScenario("populated")
    const snapshot = await getDashboard()
    expect(snapshot.counts.assigned).toBe(8)
  })

  it("returns store-empty for empty scenario", async () => {
    setMockScenario("empty")
    const snapshot = await getDashboard()
    expect(snapshot.isStoreEmpty).toBe(true)
  })
})
