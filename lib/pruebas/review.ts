import type {
  MockApplication,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockCandidateProfile,
  MockOpenQuestion,
  MockQuestion,
  MockResult,
  MockReview,
  MockSession,
  MockVacancy,
} from "@/lib/pruebas/types"

export interface ReviewQueueFilters {
  query: string
  vacancyId: string | null
}

export interface ReviewQueueRow {
  assignmentId: string
  candidateName: string
  candidateEmail: string
  vacancyId: string
  vacancyTitle: string
  testTitle: string
  versionNumber: number
  versionLabel: string
  openQuestionCount: number
  completedAt: string | null
}

export interface ReviewOpenItem {
  question: MockOpenQuestion
  answerText: string | null
  review: MockReview | null
}

export interface ReviewDetail {
  assignmentId: string
  candidateName: string
  vacancyTitle: string
  testTitle: string
  versionNumber: number
  instructions: string
  result: MockResult
  openItems: ReviewOpenItem[]
}

export function versionHasOpenQuestion(
  version: MockAssessmentVersion | undefined,
  questions: readonly MockQuestion[],
): boolean {
  if (!version) {
    return false
  }
  const byId = new Map(questions.map((question) => [question.id, question]))
  return version.questionIds.some((id) => byId.get(id)?.kind === "open")
}

export function listOpenQuestionsForVersion(
  version: MockAssessmentVersion,
  questions: readonly MockQuestion[],
): MockOpenQuestion[] {
  const byId = new Map(questions.map((question) => [question.id, question]))
  return version.questionIds
    .map((id) => byId.get(id))
    .filter((question): question is MockOpenQuestion => question?.kind === "open")
}

/**
 * Queue = pending result + version with at least one open question.
 * Missing results are excluded until submitSession creates a pending one.
 */
export function buildReviewQueueRows(input: {
  assignments: readonly MockAssignment[]
  applications: readonly MockApplication[]
  candidates: readonly MockCandidateProfile[]
  vacancies: readonly MockVacancy[]
  tests: readonly MockAssessmentTest[]
  versions: readonly MockAssessmentVersion[]
  questions: readonly MockQuestion[]
  results: readonly MockResult[]
  sessions: readonly MockSession[]
}): ReviewQueueRow[] {
  const {
    assignments,
    applications,
    candidates,
    vacancies,
    tests,
    versions,
    questions,
    results,
    sessions,
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
  const sessionByAssignment = new Map(
    sessions.map((session) => [session.assignmentId, session]),
  )

  const rows: ReviewQueueRow[] = []

  for (const assignment of assignments) {
    const result = resultByAssignment.get(assignment.id)
    if (!result || result.reviewStatus !== "pending") {
      continue
    }
    const version = versionById.get(assignment.testVersionId)
    if (!versionHasOpenQuestion(version, questions) || !version) {
      continue
    }
    const application = applicationById.get(assignment.applicationId)
    if (!application) {
      continue
    }
    const candidate = candidateById.get(application.candidateProfileId)
    const vacancy = vacancyById.get(application.vacancyId)
    const test = testById.get(version.testId)
    if (!candidate || !vacancy || !test) {
      continue
    }
    const session = sessionByAssignment.get(assignment.id)
    rows.push({
      assignmentId: assignment.id,
      candidateName: candidate.fullName,
      candidateEmail: candidate.email,
      vacancyId: vacancy.id,
      vacancyTitle: vacancy.title,
      testTitle: test.title,
      versionNumber: version.versionNumber,
      versionLabel: `${test.title} · v${version.versionNumber}`,
      openQuestionCount: listOpenQuestionsForVersion(version, questions).length,
      completedAt: session?.startedAt ?? assignment.assignedAt,
    })
  }

  return rows.sort((a, b) => {
    const left = a.completedAt ?? ""
    const right = b.completedAt ?? ""
    return right.localeCompare(left)
  })
}

export function filterReviewQueueRows(
  rows: readonly ReviewQueueRow[],
  filters: ReviewQueueFilters,
): ReviewQueueRow[] {
  const query = filters.query.trim().toLowerCase()
  return rows.filter((row) => {
    if (filters.vacancyId && row.vacancyId !== filters.vacancyId) {
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
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(query)
  })
}

export function answerTextFromSession(
  session: MockSession | undefined,
  questionId: string,
): string | null {
  if (!session) {
    return null
  }
  const answer = session.answers.find((item) => item.questionId === questionId)
  if (answer == null || answer.value == null) {
    return null
  }
  if (typeof answer.value === "string") {
    const trimmed = answer.value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return String(answer.value)
}

export function buildReviewDetail(input: {
  assignmentId: string
  assignments: readonly MockAssignment[]
  applications: readonly MockApplication[]
  candidates: readonly MockCandidateProfile[]
  vacancies: readonly MockVacancy[]
  tests: readonly MockAssessmentTest[]
  versions: readonly MockAssessmentVersion[]
  questions: readonly MockQuestion[]
  results: readonly MockResult[]
  sessions: readonly MockSession[]
  reviews: readonly MockReview[]
}): ReviewDetail | null {
  const {
    assignmentId,
    assignments,
    applications,
    candidates,
    vacancies,
    tests,
    versions,
    questions,
    results,
    sessions,
    reviews,
  } = input

  const queue = buildReviewQueueRows({
    assignments,
    applications,
    candidates,
    vacancies,
    tests,
    versions,
    questions,
    results,
    sessions,
  })
  if (!queue.some((row) => row.assignmentId === assignmentId)) {
    return null
  }

  const assignment = assignments.find((item) => item.id === assignmentId)
  if (!assignment) {
    return null
  }
  const result = results.find((item) => item.assignmentId === assignmentId)
  const version = versions.find((item) => item.id === assignment.testVersionId)
  if (!result || !version) {
    return null
  }
  const application = applications.find(
    (item) => item.id === assignment.applicationId,
  )
  const candidate = application
    ? candidates.find((item) => item.id === application.candidateProfileId)
    : undefined
  const vacancy = application
    ? vacancies.find((item) => item.id === application.vacancyId)
    : undefined
  const test = tests.find((item) => item.id === version.testId)
  if (!candidate || !vacancy || !test) {
    return null
  }

  const session = sessions.find((item) => item.assignmentId === assignmentId)
  const reviewByQuestion = new Map(
    reviews
      .filter((review) => review.assignmentId === assignmentId)
      .map((review) => [review.questionId, review]),
  )

  const openItems = listOpenQuestionsForVersion(version, questions).map(
    (question) => ({
      question,
      answerText: answerTextFromSession(session, question.id),
      review: reviewByQuestion.get(question.id) ?? null,
    }),
  )

  return {
    assignmentId,
    candidateName: candidate.fullName,
    vacancyTitle: vacancy.title,
    testTitle: test.title,
    versionNumber: version.versionNumber,
    instructions: version.instructions,
    result,
    openItems,
  }
}

/** Integer points in [0, maxPoints]. Rejects empty, negative, decimal, overflow. */
export function parseReviewPoints(
  raw: string,
  maxPoints: number,
): { ok: true; points: number } | { ok: false; reason: "empty" | "invalid" } {
  const trimmed = raw.trim()
  if (trimmed === "") {
    return { ok: false, reason: "empty" }
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, reason: "invalid" }
  }
  const points = Number(trimmed)
  if (!Number.isInteger(points) || points < 0 || points > maxPoints) {
    return { ok: false, reason: "invalid" }
  }
  return { ok: true, points }
}

export function validateReviewDrafts(
  items: readonly {
    questionId: string
    maxPoints: number
    pointsRaw: string
  }[],
): Record<string, "empty" | "invalid"> {
  const errors: Record<string, "empty" | "invalid"> = {}
  for (const item of items) {
    const parsed = parseReviewPoints(item.pointsRaw, item.maxPoints)
    if (!parsed.ok) {
      errors[item.questionId] = parsed.reason
    }
  }
  return errors
}
