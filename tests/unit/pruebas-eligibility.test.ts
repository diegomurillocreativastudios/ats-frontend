import { describe, expect, it } from "vitest"

import {
  canStartSession,
  evaluateEligibility,
  type EligibilityContext,
} from "@/lib/pruebas/eligibility"
import { MOCK_IDS, MOCK_NOW, createMockFixtures } from "@/lib/pruebas/mock-fixtures"
import type {
  EligibilityReason,
  MockApplication,
  MockAssessmentLink,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockVacancy,
} from "@/lib/pruebas/types"

function baseContext(): EligibilityContext {
  const store = createMockFixtures()
  const application = store.applications.find((item) => item.id === MOCK_IDS.appSofia)!
  const vacancy = store.vacancies.find((item) => item.id === MOCK_IDS.vacancyOpen)!
  const link = store.links.find((item) => item.id === MOCK_IDS.linkActive)!
  const version = store.versions.find(
    (item) => item.id === MOCK_IDS.versionTechnicalV1
  )!
  const test = store.tests.find((item) => item.id === MOCK_IDS.testTechnical)!
  return {
    application,
    vacancy,
    link,
    test,
    version,
    existingAssignments: [] as MockAssignment[],
    targetVacancyId: MOCK_IDS.vacancyOpen,
  }
}

describe("evaluateEligibility", () => {
  it("allows an active application on an open vacancy with an active published link", () => {
    expect(evaluateEligibility(baseContext())).toEqual({ ok: true })
  })

  it.each([
    [
      "vacancy_mismatch",
      (ctx: ReturnType<typeof baseContext>) => {
        ctx.targetVacancyId = MOCK_IDS.vacancyClosed
      },
    ],
    [
      "application_inactive",
      (ctx: ReturnType<typeof baseContext>) => {
        ctx.application = { ...ctx.application, isActive: false }
      },
    ],
    [
      "application_final",
      (ctx: ReturnType<typeof baseContext>) => {
        ctx.application = {
          ...ctx.application,
          status: "hired",
          isActive: true,
        } satisfies MockApplication
      },
    ],
    [
      "vacancy_closed",
      (ctx: ReturnType<typeof baseContext>) => {
        ctx.vacancy = {
          ...ctx.vacancy,
          status: "closed",
          isDone: true,
        } satisfies MockVacancy
      },
    ],
    [
      "link_inactive",
      (ctx: ReturnType<typeof baseContext>) => {
        ctx.link = { ...ctx.link, active: false } satisfies MockAssessmentLink
      },
    ],
    [
      "test_not_published",
      (ctx: ReturnType<typeof baseContext>) => {
        ctx.test = {
          ...ctx.test,
          lifecycleStatus: "archived",
        } satisfies MockAssessmentTest
      },
    ],
    [
      "duplicate_assignment",
      (ctx: ReturnType<typeof baseContext>) => {
        ctx.existingAssignments = [
          {
            id: "dup",
            applicationId: ctx.application.id,
            testVersionId: ctx.version.id,
            status: "pending",
            assignedAt: MOCK_NOW,
            expiresAt: "2026-10-27T18:00:00.000Z",
            allowedAttempts: 1,
          },
        ]
      },
    ],
  ] as const)("returns %s as the first failing reason", (reason, mutate) => {
    const ctx = baseContext()
    mutate(ctx)
    const result = evaluateEligibility(ctx)
    expect(result).toEqual({
      ok: false,
      reason: reason as EligibilityReason,
    })
  })

  it("prefers vacancy_mismatch over later reasons", () => {
    const ctx = baseContext()
    ctx.targetVacancyId = "other"
    ctx.link = { ...ctx.link, active: false }
    expect(evaluateEligibility(ctx)).toEqual({
      ok: false,
      reason: "vacancy_mismatch",
    })
  })
})

describe("canStartSession", () => {
  const assignment: MockAssignment = {
    id: "asg",
    applicationId: MOCK_IDS.appSofia,
    testVersionId: MOCK_IDS.versionTechnicalV1,
    status: "pending",
    assignedAt: "2026-10-01T09:00:00.000Z",
    expiresAt: "2026-10-27T18:00:00.000Z",
    allowedAttempts: 1,
  }

  it("allows a pending assignment before expiry with attempts left", () => {
    expect(
      canStartSession({
        assignment,
        sessionsForAssignment: [],
        now: MOCK_NOW,
      })
    ).toEqual({ ok: true })
  })

  it("blocks when expiresAt is before now", () => {
    expect(
      canStartSession({
        assignment: { ...assignment, expiresAt: "2026-10-01T18:00:00.000Z" },
        sessionsForAssignment: [],
        now: MOCK_NOW,
      })
    ).toEqual({ ok: false, reason: "expired" })
  })

  it("blocks when attempts are exhausted", () => {
    expect(
      canStartSession({
        assignment,
        sessionsForAssignment: [{ attemptNumber: 1 }],
        now: MOCK_NOW,
      })
    ).toEqual({ ok: false, reason: "attempts_exhausted" })
  })

  it("blocks cancelled assignments", () => {
    expect(
      canStartSession({
        assignment: { ...assignment, status: "cancelled" },
        sessionsForAssignment: [],
        now: MOCK_NOW,
      })
    ).toEqual({ ok: false, reason: "application_inactive" })
  })
})

describe("fixture integrity for eligibility cases", () => {
  it("keeps technical published version at exactly six questions", () => {
    const store = createMockFixtures()
    const version = store.versions.find(
      (item) => item.id === MOCK_IDS.versionTechnicalV1
    ) as MockAssessmentVersion
    expect(version.questionIds).toHaveLength(6)
  })

  it("keeps Análisis dimension score at 81", () => {
    const store = createMockFixtures()
    const result = store.results[0]
    expect(result.dimensionScores?.Análisis).toBe(81)
  })
})
