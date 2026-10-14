import { beforeEach, describe, expect, it } from "vitest"

import { createMockFixtures, MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import {
  debugSnapshotStore,
  finishReview,
  MockServiceError,
  resetMockStore,
  saveReviewDrafts,
  setMockScenario,
  submitSession,
} from "@/lib/pruebas/mock-service"
import {
  buildReviewDetail,
  buildReviewQueueRows,
  filterReviewQueueRows,
  parseReviewPoints,
  validateReviewDrafts,
} from "@/lib/pruebas/review"

beforeEach(() => {
  resetMockStore()
  setMockScenario("populated")
})

describe("parseReviewPoints", () => {
  it("accepts integers from 0 to max inclusive", () => {
    expect(parseReviewPoints("0", 5)).toEqual({ ok: true, points: 0 })
    expect(parseReviewPoints("5", 5)).toEqual({ ok: true, points: 5 })
  })

  it("rejects empty, decimals, negatives and overflow", () => {
    expect(parseReviewPoints("", 5)).toEqual({ ok: false, reason: "empty" })
    expect(parseReviewPoints("1.5", 5)).toEqual({ ok: false, reason: "invalid" })
    expect(parseReviewPoints("-1", 5)).toEqual({ ok: false, reason: "invalid" })
    expect(parseReviewPoints("6", 5)).toEqual({ ok: false, reason: "invalid" })
  })
})

describe("buildReviewQueueRows", () => {
  it("includes Diego and excludes Lucia and Sofia", () => {
    const store = createMockFixtures()
    const rows = buildReviewQueueRows(store)
    const ids = rows.map((row) => row.assignmentId)
    expect(ids).toContain(MOCK_IDS.assignmentDiegoPendingReview)
    expect(ids).not.toContain(MOCK_IDS.assignmentLuciaSubmitted)
    expect(ids).not.toContain(MOCK_IDS.assignmentSofiaPending)
    expect(rows).toHaveLength(1)
  })

  it("filters by vacancy and query", () => {
    const store = createMockFixtures()
    const rows = buildReviewQueueRows(store)
    expect(
      filterReviewQueueRows(rows, {
        query: "diego",
        vacancyId: MOCK_IDS.vacancyOpen,
      }),
    ).toHaveLength(1)
    expect(
      filterReviewQueueRows(rows, {
        query: "nobody",
        vacancyId: null,
      }),
    ).toHaveLength(0)
  })
})

describe("buildReviewDetail", () => {
  it("exposes Diego open answer and returns null outside the queue", () => {
    const store = createMockFixtures()
    const detail = buildReviewDetail({
      ...store,
      assignmentId: MOCK_IDS.assignmentDiegoPendingReview,
    })
    expect(detail).not.toBeNull()
    expect(detail!.openItems).toHaveLength(1)
    expect(detail!.openItems[0]!.answerText).toMatch(/sprint/i)

    expect(
      buildReviewDetail({
        ...store,
        assignmentId: MOCK_IDS.assignmentLuciaSubmitted,
      }),
    ).toBeNull()
  })
})

describe("review mock service", () => {
  it("rejects invalid points and finishes without changing score", async () => {
    await expect(
      saveReviewDrafts({
        assignmentId: MOCK_IDS.assignmentDiegoPendingReview,
        items: [
          {
            questionId: MOCK_IDS.qOpen,
            pointsAwarded: 9,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "invalid_points" } satisfies Partial<MockServiceError>)

    const before = debugSnapshotStore().results.find(
      (item) => item.assignmentId === MOCK_IDS.assignmentDiegoPendingReview,
    )
    expect(before?.score).toBe(12)
    expect(before?.maxScore).toBe(20)

    await saveReviewDrafts({
      assignmentId: MOCK_IDS.assignmentDiegoPendingReview,
      items: [
        {
          questionId: MOCK_IDS.qOpen,
          pointsAwarded: 4,
          reviewerNotes: "Clara",
        },
      ],
    })

    const finished = await finishReview({
      assignmentId: MOCK_IDS.assignmentDiegoPendingReview,
      items: [
        {
          questionId: MOCK_IDS.qOpen,
          pointsAwarded: 4,
          reviewerNotes: "Clara",
        },
      ],
    })

    expect(finished.result.reviewStatus).toBe("reviewed")
    expect(finished.result.score).toBe(12)
    expect(finished.result.maxScore).toBe(20)
    expect(finished.reviews[0]?.status).toBe("reviewed")

    const store = debugSnapshotStore()
    expect(
      store.trackingEvents.some(
        (event) =>
          event.assignmentId === MOCK_IDS.assignmentDiegoPendingReview &&
          event.kind === "reviewed",
      ),
    ).toBe(true)
    expect(
      buildReviewQueueRows(store).map((row) => row.assignmentId),
    ).not.toContain(MOCK_IDS.assignmentDiegoPendingReview)
  })

  it("creates a pending result on submit when the version has open questions", async () => {
    await submitSession(MOCK_IDS.sessionAnaInProgress)
    const created = debugSnapshotStore().results.find(
      (item) => item.assignmentId === MOCK_IDS.assignmentAnaInProgress,
    )
    expect(created?.reviewStatus).toBe("pending")
    expect(
      buildReviewQueueRows(debugSnapshotStore()).map((row) => row.assignmentId),
    ).toContain(MOCK_IDS.assignmentAnaInProgress)
  })

  it("rejects finish when there is no pending result", async () => {
    await expect(
      finishReview({
        assignmentId: MOCK_IDS.assignmentLuciaSubmitted,
        items: [
          {
            questionId: MOCK_IDS.qOpen,
            pointsAwarded: 3,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "action_not_allowed" })
  })
})

describe("validateReviewDrafts", () => {
  it("maps field errors for empty and invalid values", () => {
    expect(
      validateReviewDrafts([
        { questionId: "a", maxPoints: 5, pointsRaw: "" },
        { questionId: "b", maxPoints: 5, pointsRaw: "2.2" },
      ]),
    ).toEqual({
      a: "empty",
      b: "invalid",
    })
  })
})
