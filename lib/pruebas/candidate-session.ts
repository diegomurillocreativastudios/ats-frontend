import { canStartSession } from "@/lib/pruebas/eligibility"
import { isApplicationClosedForTracking } from "@/lib/pruebas/tracking"
import type {
  MockApplication,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockCandidateProfile,
  MockPruebasStore,
  MockQuestion,
  MockSession,
  MockVacancy,
} from "@/lib/pruebas/types"

export type CandidateScreenKind =
  | "invalid"
  | "application_closed"
  | "cancelled"
  | "expired"
  | "already_submitted"
  | "time_up"
  | "resume"
  | "welcome"
  | "attempts_exhausted"

export interface CandidateDemoPayload {
  assignment: MockAssignment
  application: MockApplication
  candidate: MockCandidateProfile
  vacancy: MockVacancy
  test: MockAssessmentTest
  version: MockAssessmentVersion
  questions: MockQuestion[]
  session: MockSession | null
}

export type CandidateDemoView =
  | { screen: "invalid" }
  | { screen: "application_closed"; payload: CandidateDemoPayload }
  | { screen: "cancelled"; payload: CandidateDemoPayload }
  | { screen: "expired"; payload: CandidateDemoPayload }
  | { screen: "already_submitted"; payload: CandidateDemoPayload }
  | { screen: "time_up"; payload: CandidateDemoPayload }
  | { screen: "resume"; payload: CandidateDemoPayload & { session: MockSession } }
  | { screen: "welcome"; payload: CandidateDemoPayload }
  | { screen: "attempts_exhausted"; payload: CandidateDemoPayload }

export interface ResolveCandidateDemoInput {
  store: MockPruebasStore
  demoToken: string
  /** Assignment expiry clock (fixtures use MOCK_NOW). */
  nowIso: string
  /** Session deadline clock (wall clock ms). */
  wallClockMs: number
}

function buildPayload(
  store: MockPruebasStore,
  assignment: MockAssignment,
): CandidateDemoPayload | null {
  const application = store.applications.find(
    (item) => item.id === assignment.applicationId,
  )
  if (!application) return null

  const candidate = store.candidates.find(
    (item) => item.id === application.candidateProfileId,
  )
  const vacancy = store.vacancies.find(
    (item) => item.id === application.vacancyId,
  )
  const version = store.versions.find(
    (item) => item.id === assignment.testVersionId,
  )
  if (!candidate || !vacancy || !version) return null

  const test = store.tests.find((item) => item.id === version.testId)
  if (!test) return null

  const questions = version.questionIds
    .map((id) => store.questions.find((question) => question.id === id))
    .filter((question): question is MockQuestion => question !== undefined)

  const sessions = store.sessions.filter(
    (session) => session.assignmentId === assignment.id,
  )
  const activeSession =
    sessions.find((session) => session.status === "in_progress") ?? null

  return {
    assignment,
    application,
    candidate,
    vacancy,
    test,
    version,
    questions,
    session: activeSession,
  }
}

/**
 * Pure resolver for the candidate demo route. Order is fixed — do not reorder.
 */
export function resolveCandidateDemo(
  input: ResolveCandidateDemoInput,
): CandidateDemoView {
  const { store, demoToken, nowIso, wallClockMs } = input
  const assignment = store.assignments.find((item) => item.id === demoToken)
  if (!assignment) {
    return { screen: "invalid" }
  }

  const payload = buildPayload(store, assignment)
  if (!payload) {
    return { screen: "invalid" }
  }

  const closed = isApplicationClosedForTracking(payload.application)
  if (closed.closed) {
    return { screen: "application_closed", payload }
  }

  if (assignment.status === "cancelled") {
    return { screen: "cancelled", payload }
  }

  if (assignment.status === "expired" || assignment.expiresAt < nowIso) {
    return { screen: "expired", payload }
  }

  const sessionsForAssignment = store.sessions.filter(
    (session) => session.assignmentId === assignment.id,
  )
  const hasSubmitted = sessionsForAssignment.some(
    (session) => session.status === "submitted",
  )
  if (assignment.status === "completed" || hasSubmitted) {
    return { screen: "already_submitted", payload }
  }

  const inProgress = sessionsForAssignment.find(
    (session) => session.status === "in_progress",
  )
  if (inProgress) {
    const deadlineMs = Date.parse(inProgress.deadlineAt)
    if (!Number.isNaN(deadlineMs) && deadlineMs <= wallClockMs) {
      return {
        screen: "time_up",
        payload: { ...payload, session: inProgress },
      }
    }
    return {
      screen: "resume",
      payload: { ...payload, session: inProgress },
    }
  }

  const start = canStartSession({
    assignment,
    sessionsForAssignment,
    now: nowIso,
  })
  if (start.ok === false) {
    if (start.reason === "attempts_exhausted") {
      return { screen: "attempts_exhausted", payload }
    }
    if (start.reason === "expired") {
      return { screen: "expired", payload }
    }
    return { screen: "application_closed", payload }
  }

  return { screen: "welcome", payload }
}

export function isAnswerComplete(
  question: MockQuestion,
  value: unknown,
): boolean {
  switch (question.kind) {
    case "single_choice":
      return typeof value === "string" && value.length > 0
    case "multiple_choice":
      return Array.isArray(value) && value.length > 0
    case "true_false":
      return typeof value === "boolean"
    case "likert":
      return typeof value === "number" && Number.isFinite(value)
    case "numeric":
      return typeof value === "number" && Number.isFinite(value)
    case "open":
      return typeof value === "string" && value.trim().length > 0
    default:
      return false
  }
}

export function answersMapFromSession(
  session: MockSession | null | undefined,
): Record<string, unknown> {
  if (!session) return {}
  const map: Record<string, unknown> = {}
  for (const answer of session.answers) {
    map[answer.questionId] = answer.value
  }
  return map
}

export function buildSessionDeadlineIso(
  startedAtMs: number,
  durationMinutes: number,
): string {
  const safeMinutes =
    Number.isFinite(durationMinutes) && durationMinutes > 0
      ? durationMinutes
      : 1
  return new Date(startedAtMs + safeMinutes * 60_000).toISOString()
}
