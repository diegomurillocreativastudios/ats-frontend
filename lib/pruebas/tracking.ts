import { isExpiresAtValid } from "@/lib/pruebas/assignments"
import { isApplicationFinal } from "@/lib/pruebas/eligibility"
import type {
  AssignmentStatus,
  MockApplication,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockCandidateProfile,
  MockResult,
  MockSession,
  MockTrackingEvent,
  MockVacancy,
  TrackingAction,
  TrackingQualificationLabel,
} from "@/lib/pruebas/types"

export type { TrackingAction, TrackingQualificationLabel }

export interface TrackingListFilters {
  query: string
  status: AssignmentStatus | null
  qualification: TrackingQualificationLabel | null
}

export interface TrackingListRow {
  assignment: MockAssignment
  candidateName: string
  candidateEmail: string
  vacancyTitle: string
  testTitle: string
  versionNumber: number
  versionLabel: string
  status: AssignmentStatus
  qualification: TrackingQualificationLabel | null
  assignedAt: string
  expiresAt: string
  allowedAttempts: number
  attemptsUsed: number
  isApplicationClosed: boolean
  applicationClosedReason: "inactive" | "final" | null
  actions: readonly TrackingAction[]
  events: MockTrackingEvent[]
}

export function resolveQualificationLabel(
  status: AssignmentStatus,
  result: MockResult | undefined,
): TrackingQualificationLabel | null {
  if (status !== "completed") {
    return null
  }
  if (!result) {
    return "answers_submitted"
  }
  if (result.reviewStatus === "pending") {
    return "pending_review"
  }
  return "reviewed"
}

export function isApplicationClosedForTracking(
  application: MockApplication | undefined,
): {
  closed: boolean
  reason: "inactive" | "final" | null
} {
  if (!application) {
    return { closed: true, reason: "inactive" }
  }
  if (!application.isActive) {
    return { closed: true, reason: "inactive" }
  }
  if (isApplicationFinal(application.status)) {
    return { closed: true, reason: "final" }
  }
  return { closed: false, reason: null }
}

/**
 * Pure action matrix for assignment tracking. Does not mutate state.
 * `expiresAtYmd` is only required when checking whether extend is allowed
 * against a proposed date; pass null to skip the date validity check.
 */
export function getTrackingActions(input: {
  status: AssignmentStatus
  isApplicationClosed: boolean
  attemptsUsed: number
  allowedAttempts: number
  expiresAtYmd?: string | null
  nowIso?: string
}): TrackingAction[] {
  const {
    status,
    isApplicationClosed,
    attemptsUsed,
    allowedAttempts,
    expiresAtYmd = null,
    nowIso,
  } = input

  const actions: TrackingAction[] = []

  const canRemindOrExtend =
    (status === "pending" ||
      status === "in_progress" ||
      status === "expired") &&
    !isApplicationClosed

  if (canRemindOrExtend) {
    actions.push("remind")
  }

  if (status === "pending" || status === "in_progress") {
    actions.push("cancel")
  }

  if (canRemindOrExtend) {
    if (
      expiresAtYmd === null ||
      nowIso === undefined ||
      isExpiresAtValid(expiresAtYmd, nowIso)
    ) {
      actions.push("extend")
    }
  }

  const canRetry =
    status === "expired" &&
    !isApplicationClosed &&
    attemptsUsed >= allowedAttempts

  if (canRetry) {
    actions.push("retry")
  }

  return actions
}

export function canPerformTrackingAction(
  actions: readonly TrackingAction[],
  action: TrackingAction,
): boolean {
  return actions.includes(action)
}

export function buildTrackingRows(input: {
  assignments: readonly MockAssignment[]
  applications: readonly MockApplication[]
  candidates: readonly MockCandidateProfile[]
  vacancies: readonly MockVacancy[]
  tests: readonly MockAssessmentTest[]
  versions: readonly MockAssessmentVersion[]
  sessions: readonly MockSession[]
  results: readonly MockResult[]
  trackingEvents: readonly MockTrackingEvent[]
}): TrackingListRow[] {
  const {
    assignments,
    applications,
    candidates,
    vacancies,
    tests,
    versions,
    sessions,
    results,
    trackingEvents,
  } = input

  const applicationById = new Map(
    applications.map((application) => [application.id, application]),
  )
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  )
  const vacancyById = new Map(vacancies.map((vacancy) => [vacancy.id, vacancy]))
  const versionById = new Map(versions.map((version) => [version.id, version]))
  const testById = new Map(tests.map((test) => [test.id, test]))
  const resultByAssignment = new Map(
    results.map((result) => [result.assignmentId, result]),
  )

  return assignments
    .map((assignment) => {
      const application = applicationById.get(assignment.applicationId)
      const candidate = application
        ? candidateById.get(application.candidateProfileId)
        : undefined
      const vacancy = application
        ? vacancyById.get(application.vacancyId)
        : undefined
      const version = versionById.get(assignment.testVersionId)
      const test = version ? testById.get(version.testId) : undefined
      const result = resultByAssignment.get(assignment.id)
      const attemptsUsed = sessions.filter(
        (session) => session.assignmentId === assignment.id,
      ).length
      const closed = isApplicationClosedForTracking(application)
      const qualification = resolveQualificationLabel(assignment.status, result)
      const events = trackingEvents
        .filter((event) => event.assignmentId === assignment.id)
        .slice()
        .sort((a, b) => a.at.localeCompare(b.at))

      const actions = getTrackingActions({
        status: assignment.status,
        isApplicationClosed: closed.closed,
        attemptsUsed,
        allowedAttempts: assignment.allowedAttempts,
      })

      return {
        assignment,
        candidateName: candidate?.fullName ?? assignment.applicationId,
        candidateEmail: candidate?.email ?? "",
        vacancyTitle: vacancy?.title ?? "",
        testTitle: test?.title ?? "",
        versionNumber: version?.versionNumber ?? 0,
        versionLabel: test
          ? `${test.title} · v${version?.versionNumber ?? "?"}`
          : assignment.testVersionId,
        status: assignment.status,
        qualification,
        assignedAt: assignment.assignedAt,
        expiresAt: assignment.expiresAt,
        allowedAttempts: assignment.allowedAttempts,
        attemptsUsed,
        isApplicationClosed: closed.closed,
        applicationClosedReason: closed.reason,
        actions,
        events,
      }
    })
    .sort((a, b) => {
      const assignedCmp = b.assignedAt.localeCompare(a.assignedAt)
      if (assignedCmp !== 0) return assignedCmp
      return a.candidateName.localeCompare(b.candidateName)
    })
}

export function filterTrackingRows(
  rows: readonly TrackingListRow[],
  filters: TrackingListFilters,
): TrackingListRow[] {
  const query = filters.query.trim().toLowerCase()
  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) {
      return false
    }
    if (filters.qualification && row.qualification !== filters.qualification) {
      return false
    }
    if (!query) {
      return true
    }
    const haystack = [
      row.candidateName,
      row.candidateEmail,
      row.vacancyTitle,
      row.testTitle,
      row.versionLabel,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(query)
  })
}

export function paginateTrackingRows<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}
