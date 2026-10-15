import { beforeEach, describe, expect, it } from "vitest"

import {
  answersMapFromSession,
  buildSessionDeadlineIso,
  isAnswerComplete,
  resolveCandidateDemo,
} from "@/lib/pruebas/candidate-session"
import { MOCK_IDS, MOCK_NOW, createMockFixtures } from "@/lib/pruebas/mock-fixtures"
import {
  debugReplaceStore,
  debugSnapshotStore,
  getCandidateDemo,
  resetMockStore,
  saveSessionAnswers,
  setMockScenario,
  submitSession,
} from "@/lib/pruebas/mock-service"
import type { MockPruebasStore, MockQuestion } from "@/lib/pruebas/types"

beforeEach(() => {
  resetMockStore()
  setMockScenario("populated")
})

describe("resolveCandidateDemo", () => {
  it("returns invalid for unknown token", () => {
    const view = resolveCandidateDemo({
      store: createMockFixtures(),
      demoToken: "asg-missing",
      nowIso: MOCK_NOW,
      wallClockMs: Date.parse("2026-10-13T18:00:00.000Z"),
    })
    expect(view.screen).toBe("invalid")
  })

  it("returns application_closed for Elena", () => {
    const view = resolveCandidateDemo({
      store: createMockFixtures(),
      demoToken: MOCK_IDS.assignmentElenaPending,
      nowIso: MOCK_NOW,
      wallClockMs: Date.now(),
    })
    expect(view.screen).toBe("application_closed")
  })

  it("returns cancelled for Nora before canStartSession reasons", () => {
    const view = resolveCandidateDemo({
      store: createMockFixtures(),
      demoToken: MOCK_IDS.assignmentNoraCancelled,
      nowIso: MOCK_NOW,
      wallClockMs: Date.now(),
    })
    expect(view.screen).toBe("cancelled")
  })

  it("returns expired for Carlos even though attempts are also exhausted", () => {
    const view = resolveCandidateDemo({
      store: createMockFixtures(),
      demoToken: MOCK_IDS.assignmentCarlosExpired,
      nowIso: MOCK_NOW,
      wallClockMs: Date.now(),
    })
    expect(view.screen).toBe("expired")
  })

  it("returns already_submitted for Lucia", () => {
    const view = resolveCandidateDemo({
      store: createMockFixtures(),
      demoToken: MOCK_IDS.assignmentLuciaSubmitted,
      nowIso: MOCK_NOW,
      wallClockMs: Date.now(),
    })
    expect(view.screen).toBe("already_submitted")
  })

  it("returns resume for Ana with saved answer and future deadline", () => {
    const view = resolveCandidateDemo({
      store: createMockFixtures(),
      demoToken: MOCK_IDS.assignmentAnaInProgress,
      nowIso: MOCK_NOW,
      wallClockMs: Date.parse("2026-10-13T18:00:00.000Z"),
    })
    expect(view.screen).toBe("resume")
    if (view.screen !== "resume") return
    expect(view.payload.session.id).toBe(MOCK_IDS.sessionAnaInProgress)
    expect(answersMapFromSession(view.payload.session)[MOCK_IDS.qSingle]).toBe(
      "opt-b",
    )
  })

  it("returns time_up when Ana session deadline is in the past on wall clock", () => {
    const view = resolveCandidateDemo({
      store: createMockFixtures(),
      demoToken: MOCK_IDS.assignmentAnaInProgress,
      nowIso: MOCK_NOW,
      wallClockMs: Date.parse("2026-11-16T00:00:00.000Z"),
    })
    expect(view.screen).toBe("time_up")
  })

  it("returns welcome for Maria", () => {
    const view = resolveCandidateDemo({
      store: createMockFixtures(),
      demoToken: MOCK_IDS.assignmentMariaDup,
      nowIso: MOCK_NOW,
      wallClockMs: Date.now(),
    })
    expect(view.screen).toBe("welcome")
    if (view.screen !== "welcome") return
    expect(view.payload.questions).toHaveLength(6)
  })

  it("returns attempts_exhausted with a synthetic store", () => {
    const store = createMockFixtures()
    store.assignments = store.assignments.map((assignment) =>
      assignment.id === MOCK_IDS.assignmentMariaDup
        ? { ...assignment, allowedAttempts: 0 }
        : assignment,
    )
    const view = resolveCandidateDemo({
      store,
      demoToken: MOCK_IDS.assignmentMariaDup,
      nowIso: MOCK_NOW,
      wallClockMs: Date.now(),
    })
    expect(view.screen).toBe("attempts_exhausted")
  })
})

describe("answer helpers", () => {
  const single: MockQuestion = {
    id: "q1",
    kind: "single_choice",
    prompt: "p",
    options: [{ id: "a", label: "A" }],
    correctOptionId: "a",
    points: 1,
  }

  it("validates required answers by kind", () => {
    expect(isAnswerComplete(single, "a")).toBe(true)
    expect(isAnswerComplete(single, "")).toBe(false)
    expect(
      isAnswerComplete(
        {
          id: "q2",
          kind: "multiple_choice",
          prompt: "p",
          options: [{ id: "a", label: "A" }],
          correctOptionIds: ["a"],
          points: 1,
        },
        ["a"],
      ),
    ).toBe(true)
    expect(
      isAnswerComplete(
        {
          id: "q3",
          kind: "true_false",
          prompt: "p",
          correct: true,
          points: 1,
        },
        true,
      ),
    ).toBe(true)
    expect(
      isAnswerComplete(
        {
          id: "q4",
          kind: "likert",
          prompt: "p",
          scaleMin: 1,
          scaleMax: 5,
          dimension: "A",
          reversed: false,
        },
        3,
      ),
    ).toBe(true)
    expect(
      isAnswerComplete(
        {
          id: "q5",
          kind: "numeric",
          prompt: "p",
          expected: 1,
          tolerance: 0,
          points: 1,
        },
        1,
      ),
    ).toBe(true)
    expect(
      isAnswerComplete(
        {
          id: "q6",
          kind: "open",
          prompt: "p",
          rubric: "r",
          maxPoints: 2,
        },
        "  text ",
      ),
    ).toBe(true)
    expect(
      isAnswerComplete(
        {
          id: "q6b",
          kind: "open",
          prompt: "p",
          rubric: "r",
          maxPoints: 2,
        },
        "   ",
      ),
    ).toBe(false)
  })

  it("builds session deadline from wall clock", () => {
    const iso = buildSessionDeadlineIso(Date.parse("2026-10-13T18:00:00.000Z"), 45)
    expect(iso).toBe("2026-10-13T18:45:00.000Z")
  })
})

describe("candidate mock service", () => {
  it("getCandidateDemo mirrors the pure resolver for Maria", async () => {
    const view = await getCandidateDemo(MOCK_IDS.assignmentMariaDup)
    expect(view.screen).toBe("welcome")
  })

  it("saves answers and submits creating a pending result when open questions exist", async () => {
    const beforeResults = debugSnapshotStore().results.length
    const saved = await saveSessionAnswers(MOCK_IDS.sessionAnaInProgress, [
      { questionId: MOCK_IDS.qSingle, value: "opt-a" },
      { questionId: MOCK_IDS.qOpen, value: "demo answer" },
    ])
    expect(saved.answers).toHaveLength(2)

    const submitted = await submitSession(MOCK_IDS.sessionAnaInProgress)
    expect(submitted.status).toBe("submitted")
    const store = debugSnapshotStore()
    expect(
      store.assignments.find((item) => item.id === MOCK_IDS.assignmentAnaInProgress)
        ?.status,
    ).toBe("completed")
    expect(store.results.length).toBe(beforeResults + 1)
    const created = store.results.find(
      (item) => item.assignmentId === MOCK_IDS.assignmentAnaInProgress,
    )
    expect(created?.reviewStatus).toBe("pending")
    expect(created?.score).toBeUndefined()
  })

  it("keeps eight assignments after seeding Ana session", () => {
    const store = createMockFixtures()
    expect(store.assignments).toHaveLength(8)
    expect(
      store.sessions.some(
        (session) => session.id === MOCK_IDS.sessionAnaInProgress,
      ),
    ).toBe(true)
  })

  it("does not invent a ninth assignment when replacing store", () => {
    const next: MockPruebasStore = createMockFixtures()
    debugReplaceStore(next)
    expect(debugSnapshotStore().assignments).toHaveLength(8)
  })
})
