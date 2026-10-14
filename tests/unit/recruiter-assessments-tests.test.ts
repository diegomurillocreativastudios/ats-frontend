import { describe, expect, it, vi } from "vitest"

import {
  buildAssessmentTestsQuery,
  getAssessmentApiErrorCode,
  normalizeAssessmentQuestion,
  normalizeAssessmentTest,
  normalizeAssessmentTestDetail,
  normalizeAssessmentTestsList,
  normalizeAssessmentVersion,
  normalizeVersionSnapshot,
} from "@/lib/api/recruiter-assessments-tests"

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe("buildAssessmentTestsQuery", () => {
  it("omits empty filters", () => {
    expect(buildAssessmentTestsQuery({})).toBe("")
  })

  it("maps FE filters to API query params", () => {
    const qs = buildAssessmentTestsQuery({
      type: "technical",
      status: "draft",
      q: "logic",
      ownerCompanyId: "c1",
      page: 2,
      pageSize: 20,
    })
    const params = new URLSearchParams(qs.slice(1))
    expect(params.get("type")).toBe("Technical")
    expect(params.get("status")).toBe("Draft")
    expect(params.get("q")).toBe("logic")
    expect(params.get("ownerCompanyId")).toBe("c1")
    expect(params.get("page")).toBe("2")
    expect(params.get("pageSize")).toBe("20")
  })
})

describe("normalizeAssessmentTest", () => {
  it("maps type/status/ownerCompanyId", () => {
    const test = normalizeAssessmentTest({
      id: "t1",
      title: "JS",
      description: "desc",
      type: "Technical",
      status: "Published",
      ownerCompanyId: "co-1",
      draftVersionNumber: 2,
      createdAtUtc: "2026-10-01T00:00:00Z",
    })
    expect(test).toMatchObject({
      id: "t1",
      kind: "technical",
      lifecycleStatus: "published",
      companyId: "co-1",
      draftVersion: 2,
    })
  })
})

describe("normalizeAssessmentVersion", () => {
  it("treats unpublished as draft without publishedAt", () => {
    const version = normalizeAssessmentVersion({
      id: "v1",
      testId: "t1",
      versionNumber: 1,
      instructions: "Go",
      durationMinutes: 30,
      maxAttempts: 2,
      isPublished: false,
      questionIds: ["q1"],
    })
    expect(version?.publishedAt).toBeUndefined()
    expect(version?.questionIds).toEqual(["q1"])
  })
})

describe("normalizeAssessmentQuestion", () => {
  it("maps OpenText to open", () => {
    const question = normalizeAssessmentQuestion({
      id: "q1",
      type: "OpenText",
      prompt: "Explain",
      rubric: "Clear",
      maxPoints: 5,
    })
    expect(question).toMatchObject({
      kind: "open",
      maxPoints: 5,
    })
  })

  it("maps dimensionKey and reverseScored for Likert", () => {
    const question = normalizeAssessmentQuestion({
      id: "qL",
      type: "Likert",
      prompt: "Agree?",
      dimensionKey: "Focus",
      reverseScored: true,
    })
    expect(question).toMatchObject({
      kind: "likert",
      dimension: "Focus",
      reversed: true,
    })
  })
})

describe("normalizeAssessmentTestDetail", () => {
  it("prefers openDraft questions as current", () => {
    const detail = normalizeAssessmentTestDetail({
      id: "t1",
      title: "Test",
      description: "d",
      type: "Psychometric",
      status: "Draft",
      createdAtUtc: "2026-10-01T00:00:00Z",
      openDraft: {
        id: "vd",
        versionNumber: 1,
        isPublished: false,
        instructions: "i",
        durationMinutes: 20,
        maxAttempts: 1,
        questions: [
          {
            id: "qL",
            type: "Likert",
            prompt: "Agree?",
            dimension: "Focus",
            reversed: false,
          },
        ],
      },
      versions: [
        {
          id: "vp",
          versionNumber: 1,
          isPublished: true,
          publishedAtUtc: "2026-09-01T00:00:00Z",
          instructions: "old",
          durationMinutes: 20,
          maxAttempts: 1,
          questions: [],
        },
      ],
    })
    expect(detail?.openDraft?.id).toBe("vd")
    expect(detail?.currentQuestions).toHaveLength(1)
    expect(detail?.currentQuestions[0]?.kind).toBe("likert")
    expect(detail?.versions.some((version) => version.id === "vd")).toBe(true)
  })
})

describe("normalizeAssessmentTestsList", () => {
  it("accepts items wrapper or bare array", () => {
    expect(
      normalizeAssessmentTestsList({
        items: [{ id: "a", title: "A", type: "Technical", status: "Draft" }],
      }),
    ).toHaveLength(1)
    expect(
      normalizeAssessmentTestsList([
        { id: "b", title: "B", type: "Psychometric", status: "Archived" },
      ]),
    ).toHaveLength(1)
  })
})

describe("normalizeVersionSnapshot", () => {
  it("returns questions for a published version", () => {
    const snapshot = normalizeVersionSnapshot({
      id: "v2",
      testId: "t1",
      versionNumber: 2,
      isPublished: true,
      publishedAtUtc: "2026-10-02T00:00:00Z",
      instructions: "i",
      durationMinutes: 40,
      maxAttempts: 1,
      questions: [
        {
          id: "q1",
          type: "TrueFalse",
          prompt: "True?",
          correct: true,
          points: 1,
        },
      ],
    })
    expect(snapshot?.questions).toHaveLength(1)
    expect(snapshot?.version.publishedAt).toBeTruthy()
  })
})

describe("getAssessmentApiErrorCode", () => {
  it("reads code from ApiClientError body", () => {
    const error = Object.assign(new Error("x"), {
      status: 409,
      body: { message: "Archived", code: "test_archived" },
    })
    expect(getAssessmentApiErrorCode(error)).toBe("test_archived")
  })
})
