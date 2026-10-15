import { describe, expect, it } from "vitest"

import { createMockFixtures, MOCK_IDS } from "@/lib/pruebas/mock-fixtures"
import {
  buildTrackingRows,
  filterTrackingRows,
  getTrackingActions,
  resolveQualificationLabel,
} from "@/lib/pruebas/tracking"

describe("resolveQualificationLabel", () => {
  it("returns null when assignment is not completed", () => {
    expect(resolveQualificationLabel("pending", undefined)).toBeNull()
    expect(
      resolveQualificationLabel("completed", {
        id: "r1",
        assignmentId: "a1",
        reviewStatus: "pending",
      }),
    ).toBe("pending_review")
    expect(resolveQualificationLabel("completed", undefined)).toBe(
      "answers_submitted",
    )
    expect(
      resolveQualificationLabel("completed", {
        id: "r2",
        assignmentId: "a1",
        reviewStatus: "reviewed",
      }),
    ).toBe("reviewed")
  })
})

describe("getTrackingActions", () => {
  it("allows remind, cancel, and extend for pending with active application", () => {
    expect(
      getTrackingActions({
        status: "pending",
        isApplicationClosed: false,
        attemptsUsed: 0,
        allowedAttempts: 1,
      }),
    ).toEqual(["remind", "cancel", "extend"])
  })

  it("blocks remind and extend when application is closed, keeps cancel", () => {
    expect(
      getTrackingActions({
        status: "pending",
        isApplicationClosed: true,
        attemptsUsed: 0,
        allowedAttempts: 1,
      }),
    ).toEqual(["cancel"])
  })

  it("allows retry only when expired and attempts are exhausted", () => {
    expect(
      getTrackingActions({
        status: "expired",
        isApplicationClosed: false,
        attemptsUsed: 1,
        allowedAttempts: 1,
      }),
    ).toEqual(["remind", "extend", "retry"])
    expect(
      getTrackingActions({
        status: "expired",
        isApplicationClosed: false,
        attemptsUsed: 0,
        allowedAttempts: 1,
      }),
    ).toEqual(["remind", "extend"])
  })

  it("returns no mutations for cancelled or completed", () => {
    expect(
      getTrackingActions({
        status: "cancelled",
        isApplicationClosed: false,
        attemptsUsed: 0,
        allowedAttempts: 1,
      }),
    ).toEqual([])
    expect(
      getTrackingActions({
        status: "completed",
        isApplicationClosed: false,
        attemptsUsed: 1,
        allowedAttempts: 1,
      }),
    ).toEqual([])
  })
})

describe("buildTrackingRows", () => {
  it("builds seed rows with Carlos retry and Elena cancel-only", () => {
    const store = createMockFixtures()
    const rows = buildTrackingRows(store)
    const byId = new Map(rows.map((row) => [row.assignment.id, row]))

    expect(rows).toHaveLength(8)

    const carlos = byId.get(MOCK_IDS.assignmentCarlosExpired)!
    expect(carlos.actions).toEqual(["remind", "extend", "retry"])
    expect(carlos.attemptsUsed).toBe(1)

    const elena = byId.get(MOCK_IDS.assignmentElenaPending)!
    expect(elena.isApplicationClosed).toBe(true)
    expect(elena.actions).toEqual(["cancel"])

    const diego = byId.get(MOCK_IDS.assignmentDiegoPendingReview)!
    expect(diego.qualification).toBe("pending_review")

    const lucia = byId.get(MOCK_IDS.assignmentLuciaSubmitted)!
    expect(lucia.qualification).toBe("answers_submitted")

    const sofia = byId.get(MOCK_IDS.assignmentSofiaPending)!
    expect(sofia.qualification).toBe("reviewed")

    const maria = byId.get(MOCK_IDS.assignmentMariaDup)!
    expect(maria.events.some((event) => event.kind === "reminded")).toBe(true)
  })

  it("filters by status and qualification", () => {
    const store = createMockFixtures()
    const rows = buildTrackingRows(store)
    const expired = filterTrackingRows(rows, {
      query: "",
      status: "expired",
      qualification: null,
    })
    expect(expired).toHaveLength(1)
    expect(expired[0]?.assignment.id).toBe(MOCK_IDS.assignmentCarlosExpired)

    const pendingReview = filterTrackingRows(rows, {
      query: "",
      status: null,
      qualification: "pending_review",
    })
    expect(pendingReview).toHaveLength(1)
    expect(pendingReview[0]?.assignment.id).toBe(
      MOCK_IDS.assignmentDiegoPendingReview,
    )
  })
})
