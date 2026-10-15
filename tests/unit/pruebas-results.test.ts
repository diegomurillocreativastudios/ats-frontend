import { beforeEach, describe, expect, it } from "vitest"

import { createMockFixtures, MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import { resetMockStore, setMockScenario } from "@/lib/pruebas/mock-service"
import {
  buildResultsDetail,
  buildResultsListRows,
  filterResultsListRows,
  gradeClosedQuestion,
  scoreChartPoints,
} from "@/lib/pruebas/results"

beforeEach(() => {
  resetMockStore()
  setMockScenario("populated")
})

describe("buildResultsListRows", () => {
  it("lists only completed assignments including Lucia without a result", () => {
    const store = createMockFixtures()
    const rows = buildResultsListRows(store)
    const ids = rows.map((row) => row.assignmentId)

    expect(ids).toContain(MOCK_IDS.assignmentSofiaPending)
    expect(ids).toContain(MOCK_IDS.assignmentDiegoPendingReview)
    expect(ids).toContain(MOCK_IDS.assignmentLuciaSubmitted)
    expect(ids).not.toContain(MOCK_IDS.assignmentAnaInProgress)
    expect(ids).not.toContain(MOCK_IDS.assignmentMariaDup)

    const sofia = rows.find(
      (row) => row.assignmentId === MOCK_IDS.assignmentSofiaPending,
    )
    expect(sofia?.listStatus).toBe("reviewed")
    expect(sofia?.kind).toBe("psychometric")

    const diego = rows.find(
      (row) => row.assignmentId === MOCK_IDS.assignmentDiegoPendingReview,
    )
    expect(diego?.listStatus).toBe("pending")
    expect(diego?.score).toBe(12)
    expect(diego?.maxScore).toBe(20)

    const lucia = rows.find(
      (row) => row.assignmentId === MOCK_IDS.assignmentLuciaSubmitted,
    )
    expect(lucia?.listStatus).toBe("no_result")
  })

  it("filters by kind, status, query and assignedAt range", () => {
    const store = createMockFixtures()
    const rows = buildResultsListRows(store)

    expect(
      filterResultsListRows(rows, {
        query: "sofia",
        vacancyId: null,
        kind: "psychometric",
        status: "reviewed",
        assignedFrom: null,
        assignedTo: null,
      }),
    ).toHaveLength(1)

    expect(
      filterResultsListRows(rows, {
        query: "",
        vacancyId: null,
        kind: "technical",
        status: "no_result",
        assignedFrom: null,
        assignedTo: null,
      }).map((row) => row.assignmentId),
    ).toEqual([MOCK_IDS.assignmentLuciaSubmitted])

    expect(
      filterResultsListRows(rows, {
        query: "",
        vacancyId: null,
        kind: null,
        status: null,
        assignedFrom: "2026-10-11",
        assignedTo: "2026-10-11",
      }).map((row) => row.assignmentId),
    ).toEqual([MOCK_IDS.assignmentLuciaSubmitted])
  })
})

describe("buildResultsDetail", () => {
  it("builds Sofía psychometric dimensions on a 0–100 demo scale", () => {
    const store = createMockFixtures()
    const detail = buildResultsDetail({
      ...store,
      assignmentId: MOCK_IDS.assignmentSofiaPending,
    })
    expect(detail).not.toBeNull()
    expect(detail!.outcome).toBe("with_result")
    if (detail?.outcome !== "with_result") {
      return
    }
    expect(detail.kind).toBe("psychometric")
    expect(detail.hasDimensionScores).toBe(true)
    expect(scoreChartPoints(detail.dimensionScores)).toEqual([
      { name: "Análisis", value: 81 },
      { name: "Comunicación", value: 72 },
      { name: "Colaboración", value: 65 },
      { name: "Adaptabilidad", value: 70 },
    ])
    expect(detail.hasSession).toBe(false)
  })

  it("builds Diego technical detail with pending review and single-choice correct", () => {
    const store = createMockFixtures()
    const detail = buildResultsDetail({
      ...store,
      assignmentId: MOCK_IDS.assignmentDiegoPendingReview,
    })
    expect(detail).not.toBeNull()
    expect(detail!.outcome).toBe("with_result")
    if (detail?.outcome !== "with_result") {
      return
    }
    expect(detail.result.score).toBe(12)
    expect(detail.result.maxScore).toBe(20)
    expect(detail.listStatus).toBe("pending")
    expect(detail.hasCategoryScores).toBe(false)
    expect(detail.hasSession).toBe(true)

    const single = detail.questions.find(
      (item) => item.question.id === MOCK_IDS.qSingle,
    )
    expect(single?.verdict).toBe("correct")
    expect(single?.answerDisplay).toBe("32")

    const open = detail.questions.find(
      (item) => item.question.id === MOCK_IDS.qOpen,
    )
    expect(open?.verdict).toBeNull()
    expect(open?.answerDisplay).toMatch(/sprint/i)
  })

  it("returns no_result for Lucía and null for unknown or incomplete assignments", () => {
    const store = createMockFixtures()
    const lucia = buildResultsDetail({
      ...store,
      assignmentId: MOCK_IDS.assignmentLuciaSubmitted,
    })
    expect(lucia?.outcome).toBe("no_result")
    expect(lucia?.hasSession).toBe(false)

    expect(
      buildResultsDetail({
        ...store,
        assignmentId: MOCK_IDS.assignmentAnaInProgress,
      }),
    ).toBeNull()

    expect(
      buildResultsDetail({
        ...store,
        assignmentId: "asg-does-not-exist",
      }),
    ).toBeNull()
  })
})

describe("gradeClosedQuestion", () => {
  it("marks unanswered when the session has no answer for the question", () => {
    const store = createMockFixtures()
    const question = store.questions.find((item) => item.id === MOCK_IDS.qMultiple)!
    const session = store.sessions.find(
      (item) => item.id === MOCK_IDS.sessionDiegoSubmitted,
    )
    expect(gradeClosedQuestion(question, session)).toBe("unanswered")
  })
})
