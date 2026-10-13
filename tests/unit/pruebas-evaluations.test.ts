import { describe, expect, it } from "vitest"

import {
  EVALUATION_ACTIONS_BY_STATUS,
  canPerformEvaluationAction,
  filterEvaluations,
  getEvaluationActions,
  paginateEvaluations,
  resolveCurrentVersion,
  sortVersionsDesc,
} from "@/lib/pruebas/evaluations"
import type {
  MockAssessmentTest,
  MockAssessmentVersion,
} from "@/lib/pruebas/types"

const sampleTests: MockAssessmentTest[] = [
  {
    id: "a",
    title: "Alpha técnica",
    description: "",
    kind: "technical",
    lifecycleStatus: "draft",
    draftVersion: 0,
    createdAt: "2026-10-10T10:00:00.000Z",
  },
  {
    id: "b",
    title: "Beta psico",
    description: "",
    kind: "psychometric",
    lifecycleStatus: "published",
    draftVersion: 1,
    createdAt: "2026-10-12T10:00:00.000Z",
  },
  {
    id: "c",
    title: "Gamma archivada",
    description: "",
    kind: "technical",
    lifecycleStatus: "archived",
    draftVersion: 1,
    createdAt: "2026-10-11T10:00:00.000Z",
  },
]

describe("evaluation action matrix", () => {
  it("never exposes assignment statuses and matches lifecycle matrix", () => {
    expect(EVALUATION_ACTIONS_BY_STATUS.draft).toEqual([
      "view",
      "edit",
      "duplicate",
      "publish",
      "archive",
      "versions",
    ])
    expect(getEvaluationActions("published")).toEqual([
      "view",
      "duplicate",
      "archive",
      "versions",
    ])
    expect(canPerformEvaluationAction("published", "edit")).toBe(false)
    expect(canPerformEvaluationAction("published", "publish")).toBe(false)
    expect(canPerformEvaluationAction("archived", "archive")).toBe(false)
    expect(canPerformEvaluationAction("draft", "publish")).toBe(true)
  })
})

describe("filterEvaluations", () => {
  it("filters by query, kind and lifecycle and sorts by createdAt desc", () => {
    const rows = filterEvaluations(sampleTests, {
      query: "",
      kind: null,
      lifecycleStatus: null,
    })
    expect(rows.map((row) => row.id)).toEqual(["b", "c", "a"])

    const drafts = filterEvaluations(sampleTests, {
      query: "",
      kind: null,
      lifecycleStatus: "draft",
    })
    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.id).toBe("a")

    const psycho = filterEvaluations(sampleTests, {
      query: "psico",
      kind: "psychometric",
      lifecycleStatus: null,
    })
    expect(psycho).toHaveLength(1)
    expect(psycho[0]?.id).toBe("b")
  })

  it("does not treat assignment-like labels as lifecycle filters", () => {
    const rows = filterEvaluations(sampleTests, {
      query: "en curso",
      kind: null,
      lifecycleStatus: null,
    })
    expect(rows).toHaveLength(0)
  })
})

describe("paginateEvaluations", () => {
  it("slices pages safely", () => {
    expect(paginateEvaluations([1, 2, 3, 4], 1, 2)).toEqual([1, 2])
    expect(paginateEvaluations([1, 2, 3, 4], 2, 2)).toEqual([3, 4])
    expect(paginateEvaluations([1, 2, 3, 4], 0, 2)).toEqual([1, 2])
  })
})

describe("resolveCurrentVersion", () => {
  it("prefers unpublished draft over published", () => {
    const versions: MockAssessmentVersion[] = [
      {
        id: "v1",
        testId: "t1",
        versionNumber: 1,
        instructions: "pub",
        durationMinutes: 30,
        maxAttempts: 1,
        publishedAt: "2026-09-01T00:00:00.000Z",
        questionIds: [],
      },
      {
        id: "vd",
        testId: "t1",
        versionNumber: 0,
        instructions: "draft",
        durationMinutes: 40,
        maxAttempts: 1,
        questionIds: ["q1"],
      },
    ]
    expect(resolveCurrentVersion(versions, "t1")?.id).toBe("vd")
  })

  it("falls back to highest published version", () => {
    const versions: MockAssessmentVersion[] = [
      {
        id: "v1",
        testId: "t1",
        versionNumber: 1,
        instructions: "a",
        durationMinutes: 30,
        maxAttempts: 1,
        publishedAt: "2026-09-01T00:00:00.000Z",
        questionIds: [],
      },
      {
        id: "v2",
        testId: "t1",
        versionNumber: 2,
        instructions: "b",
        durationMinutes: 30,
        maxAttempts: 1,
        publishedAt: "2026-09-10T00:00:00.000Z",
        questionIds: [],
      },
    ]
    expect(resolveCurrentVersion(versions, "t1")?.id).toBe("v2")
  })
})

describe("sortVersionsDesc", () => {
  it("puts draft first then higher version numbers", () => {
    const versions: MockAssessmentVersion[] = [
      {
        id: "v1",
        testId: "t1",
        versionNumber: 1,
        instructions: "",
        durationMinutes: 1,
        maxAttempts: 1,
        publishedAt: "2026-01-01T00:00:00.000Z",
        questionIds: [],
      },
      {
        id: "vd",
        testId: "t1",
        versionNumber: 0,
        instructions: "",
        durationMinutes: 1,
        maxAttempts: 1,
        questionIds: [],
      },
      {
        id: "v2",
        testId: "t1",
        versionNumber: 2,
        instructions: "",
        durationMinutes: 1,
        maxAttempts: 1,
        publishedAt: "2026-02-01T00:00:00.000Z",
        questionIds: [],
      },
    ]
    expect(sortVersionsDesc(versions).map((v) => v.id)).toEqual([
      "vd",
      "v2",
      "v1",
    ])
  })
})
