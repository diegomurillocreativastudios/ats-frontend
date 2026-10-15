import type {
  ApplicationFinalStatus,
  EligibilityResult,
  MockApplication,
  MockAssessmentLink,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockVacancy,
  SessionStartResult,
} from "@/lib/pruebas/types"

const FINAL_STATUSES: ReadonlySet<ApplicationFinalStatus> = new Set([
  "hired",
  "rejected",
  "withdrawn",
  "discarded",
])

export function isApplicationFinal(status: MockApplication["status"]): boolean {
  return FINAL_STATUSES.has(status as ApplicationFinalStatus)
}

export function isVacancyClosed(vacancy: MockVacancy): boolean {
  return vacancy.isDeleted || vacancy.isDone || vacancy.status === "closed"
}

export interface EligibilityContext {
  application: MockApplication
  vacancy: MockVacancy
  link: MockAssessmentLink
  test: MockAssessmentTest
  version: MockAssessmentVersion
  existingAssignments: readonly MockAssignment[]
  /** Vacancy the recruiter selected for this assignment flow. */
  targetVacancyId: string
}

/**
 * Pure eligibility check. Returns the first failing reason in fixed order.
 * Does not read the clock or the mock store.
 */
export function evaluateEligibility(ctx: EligibilityContext): EligibilityResult {
  if (ctx.application.vacancyId !== ctx.targetVacancyId) {
    return { ok: false, reason: "vacancy_mismatch" }
  }
  if (!ctx.application.isActive) {
    return { ok: false, reason: "application_inactive" }
  }
  if (isApplicationFinal(ctx.application.status)) {
    return { ok: false, reason: "application_final" }
  }
  if (isVacancyClosed(ctx.vacancy)) {
    return { ok: false, reason: "vacancy_closed" }
  }
  if (!ctx.link.active) {
    return { ok: false, reason: "link_inactive" }
  }
  if (ctx.test.lifecycleStatus !== "published") {
    return { ok: false, reason: "test_not_published" }
  }
  const hasDuplicate = ctx.existingAssignments.some(
    (assignment) =>
      assignment.applicationId === ctx.application.id &&
      assignment.testVersionId === ctx.version.id &&
      assignment.status !== "cancelled"
  )
  if (hasDuplicate) {
    return { ok: false, reason: "duplicate_assignment" }
  }
  return { ok: true }
}

export interface SessionStartContext {
  assignment: MockAssignment
  sessionsForAssignment: readonly { attemptNumber: number }[]
  now: string
}

/**
 * Pure gate before starting a candidate session. Compares expiry against `now`.
 */
export function canStartSession(ctx: SessionStartContext): SessionStartResult {
  if (ctx.assignment.expiresAt < ctx.now) {
    return { ok: false, reason: "expired" }
  }
  const attemptsUsed = ctx.sessionsForAssignment.length
  if (attemptsUsed >= ctx.assignment.allowedAttempts) {
    return { ok: false, reason: "attempts_exhausted" }
  }
  if (ctx.assignment.status === "cancelled") {
    return { ok: false, reason: "application_inactive" }
  }
  if (ctx.assignment.status === "expired") {
    return { ok: false, reason: "expired" }
  }
  return { ok: true }
}
