import type {
  AssessmentKind,
  MockApplication,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockCandidateProfile,
  MockQuestion,
  MockResult,
  MockReview,
  MockSession,
  MockVacancy,
  ReviewStatus,
} from "@/lib/pruebas/types"

/** List filter: reviewed result, pending review, or completed without a result row. */
export type ResultsListStatus = ReviewStatus | "no_result"

export interface ResultsListFilters {
  query: string
  vacancyId: string | null
  kind: AssessmentKind | null
  status: ResultsListStatus | null
  /** Inclusive start of assignedAt day (UTC YYYY-MM-DD or ISO). */
  assignedFrom: string | null
  /** Inclusive end of assignedAt day (UTC YYYY-MM-DD or ISO). */
  assignedTo: string | null
}

export interface ResultsListRow {
  assignmentId: string
  candidateName: string
  candidateEmail: string
  vacancyId: string
  vacancyTitle: string
  testTitle: string
  kind: AssessmentKind
  versionNumber: number
  versionLabel: string
  assignedAt: string
  listStatus: ResultsListStatus
  score: number | null
  maxScore: number | null
}

export type ClosedQuestionVerdict = "correct" | "incorrect" | "unanswered"

export interface ResultsQuestionItem {
  question: MockQuestion
  /** Display of the candidate answer, or null when missing. */
  answerDisplay: string | null
  /** Closed-question grading when the kind supports it. */
  verdict: ClosedQuestionVerdict | null
  /** Open-question review row when present. */
  review: MockReview | null
}

export interface ResultsDetailBase {
  assignmentId: string
  candidateName: string
  vacancyId: string
  vacancyTitle: string
  testTitle: string
  kind: AssessmentKind
  versionNumber: number
  instructions: string
  assignedAt: string
  sessionStartedAt: string | null
  sessionDeadlineAt: string | null
  hasSession: boolean
}

export interface ResultsDetailNoResult extends ResultsDetailBase {
  outcome: "no_result"
  result: null
  questions: ResultsQuestionItem[]
}

export interface ResultsDetailWithResult extends ResultsDetailBase {
  outcome: "with_result"
  result: MockResult
  listStatus: ReviewStatus
  questions: ResultsQuestionItem[]
  categoryScores: Record<string, number> | null
  dimensionScores: Record<string, number> | null
  hasCategoryScores: boolean
  hasDimensionScores: boolean
}

export type ResultsDetail = ResultsDetailNoResult | ResultsDetailWithResult

function dayBounds(dayOrIso: string): { startMs: number; endMs: number } | null {
  const key = dayOrIso.length >= 10 ? dayOrIso.slice(0, 10) : dayOrIso
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return null
  }
  const startMs = Date.parse(`${key}T00:00:00.000Z`)
  const endMs = Date.parse(`${key}T23:59:59.999Z`)
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return null
  }
  return { startMs, endMs }
}

export function resolveResultsListStatus(
  result: MockResult | undefined,
): ResultsListStatus {
  if (!result) {
    return "no_result"
  }
  return result.reviewStatus
}

function arraysEqualSorted(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false
  }
  const a = [...left].sort()
  const b = [...right].sort()
  return a.every((value, index) => value === b[index])
}

export function answerDisplayFromSession(
  session: MockSession | undefined,
  question: MockQuestion,
): string | null {
  if (!session) {
    return null
  }
  const answer = session.answers.find((item) => item.questionId === question.id)
  if (answer == null || answer.value == null) {
    return null
  }

  if (question.kind === "single_choice") {
    if (typeof answer.value !== "string") {
      return String(answer.value)
    }
    const option = question.options.find((item) => item.id === answer.value)
    return option?.label ?? answer.value
  }

  if (question.kind === "multiple_choice") {
    const ids = Array.isArray(answer.value)
      ? answer.value.map(String)
      : typeof answer.value === "string"
        ? [answer.value]
        : []
    if (ids.length === 0) {
      return null
    }
    const labels = ids.map(
      (id) => question.options.find((item) => item.id === id)?.label ?? id,
    )
    return labels.join(", ")
  }

  if (question.kind === "true_false") {
    if (typeof answer.value === "boolean") {
      return answer.value ? "true" : "false"
    }
    if (answer.value === "true" || answer.value === "false") {
      return String(answer.value)
    }
    return String(answer.value)
  }

  if (question.kind === "numeric") {
    return String(answer.value)
  }

  if (question.kind === "likert") {
    return String(answer.value)
  }

  if (typeof answer.value === "string") {
    const trimmed = answer.value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return String(answer.value)
}

/**
 * Grades closed questions when a submitted session answer exists.
 * Likert and open never return a verdict.
 */
export function gradeClosedQuestion(
  question: MockQuestion,
  session: MockSession | undefined,
): ClosedQuestionVerdict | null {
  if (
    question.kind === "likert" ||
    question.kind === "open"
  ) {
    return null
  }

  if (!session) {
    return "unanswered"
  }

  const answer = session.answers.find((item) => item.questionId === question.id)
  if (answer == null || answer.value == null) {
    return "unanswered"
  }

  if (question.kind === "single_choice") {
    if (typeof answer.value !== "string" || answer.value.trim() === "") {
      return "unanswered"
    }
    return answer.value === question.correctOptionId ? "correct" : "incorrect"
  }

  if (question.kind === "multiple_choice") {
    const ids = Array.isArray(answer.value)
      ? answer.value.map(String)
      : typeof answer.value === "string" && answer.value.trim() !== ""
        ? [answer.value]
        : []
    if (ids.length === 0) {
      return "unanswered"
    }
    return arraysEqualSorted(ids, question.correctOptionIds)
      ? "correct"
      : "incorrect"
  }

  if (question.kind === "true_false") {
    let value: boolean | null = null
    if (typeof answer.value === "boolean") {
      value = answer.value
    } else if (answer.value === "true") {
      value = true
    } else if (answer.value === "false") {
      value = false
    }
    if (value === null) {
      return "unanswered"
    }
    return value === question.correct ? "correct" : "incorrect"
  }

  if (question.kind === "numeric") {
    const numeric =
      typeof answer.value === "number"
        ? answer.value
        : typeof answer.value === "string"
          ? Number(answer.value)
          : Number.NaN
    if (Number.isNaN(numeric)) {
      return "unanswered"
    }
    const delta = Math.abs(numeric - question.expected)
    return delta <= question.tolerance ? "correct" : "incorrect"
  }

  return null
}

export function buildResultsListRows(input: {
  assignments: readonly MockAssignment[]
  applications: readonly MockApplication[]
  candidates: readonly MockCandidateProfile[]
  vacancies: readonly MockVacancy[]
  tests: readonly MockAssessmentTest[]
  versions: readonly MockAssessmentVersion[]
  results: readonly MockResult[]
}): ResultsListRow[] {
  const {
    assignments,
    applications,
    candidates,
    vacancies,
    tests,
    versions,
    results,
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

  const rows: ResultsListRow[] = []

  for (const assignment of assignments) {
    if (assignment.status !== "completed") {
      continue
    }
    const application = applicationById.get(assignment.applicationId)
    if (!application) {
      continue
    }
    const candidate = candidateById.get(application.candidateProfileId)
    const vacancy = vacancyById.get(application.vacancyId)
    const version = versionById.get(assignment.testVersionId)
    const test = version ? testById.get(version.testId) : undefined
    if (!candidate || !vacancy || !version || !test) {
      continue
    }
    const result = resultByAssignment.get(assignment.id)
    rows.push({
      assignmentId: assignment.id,
      candidateName: candidate.fullName,
      candidateEmail: candidate.email,
      vacancyId: vacancy.id,
      vacancyTitle: vacancy.title,
      testTitle: test.title,
      kind: test.kind,
      versionNumber: version.versionNumber,
      versionLabel: `${test.title} · v${version.versionNumber}`,
      assignedAt: assignment.assignedAt,
      listStatus: resolveResultsListStatus(result),
      score: result?.score ?? null,
      maxScore: result?.maxScore ?? null,
    })
  }

  return rows.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
}

export function filterResultsListRows(
  rows: readonly ResultsListRow[],
  filters: ResultsListFilters,
): ResultsListRow[] {
  const query = filters.query.trim().toLowerCase()

  return rows.filter((row) => {
    if (filters.vacancyId && row.vacancyId !== filters.vacancyId) {
      return false
    }
    if (filters.kind && row.kind !== filters.kind) {
      return false
    }
    if (filters.status && row.listStatus !== filters.status) {
      return false
    }

    const assignedMs = Date.parse(row.assignedAt)
    if (Number.isNaN(assignedMs)) {
      return false
    }
    if (filters.assignedFrom) {
      const from = dayBounds(filters.assignedFrom)
      if (from && assignedMs < from.startMs) {
        return false
      }
    }
    if (filters.assignedTo) {
      const to = dayBounds(filters.assignedTo)
      if (to && assignedMs > to.endMs) {
        return false
      }
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

export function paginateResultsRows<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}

function buildQuestionItems(input: {
  version: MockAssessmentVersion
  questions: readonly MockQuestion[]
  session: MockSession | undefined
  reviews: readonly MockReview[]
  assignmentId: string
}): ResultsQuestionItem[] {
  const { version, questions, session, reviews, assignmentId } = input
  const byId = new Map(questions.map((question) => [question.id, question]))
  const reviewByQuestion = new Map(
    reviews
      .filter((review) => review.assignmentId === assignmentId)
      .map((review) => [review.questionId, review]),
  )

  return version.questionIds
    .map((id) => byId.get(id))
    .filter((question): question is MockQuestion => Boolean(question))
    .map((question) => ({
      question,
      answerDisplay: answerDisplayFromSession(session, question),
      verdict: gradeClosedQuestion(question, session),
      review: reviewByQuestion.get(question.id) ?? null,
    }))
}

/**
 * Detail for a completed assignment. Returns null when the assignment is
 * missing or not completed (UI shows not-found). Completed without a result
 * returns outcome "no_result".
 */
export function buildResultsDetail(input: {
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
}): ResultsDetail | null {
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

  const assignment = assignments.find((item) => item.id === assignmentId)
  if (!assignment || assignment.status !== "completed") {
    return null
  }

  const version = versions.find((item) => item.id === assignment.testVersionId)
  if (!version) {
    return null
  }
  const test = tests.find((item) => item.id === version.testId)
  const application = applications.find(
    (item) => item.id === assignment.applicationId,
  )
  const candidate = application
    ? candidates.find((item) => item.id === application.candidateProfileId)
    : undefined
  const vacancy = application
    ? vacancies.find((item) => item.id === application.vacancyId)
    : undefined
  if (!test || !candidate || !vacancy) {
    return null
  }

  const session = sessions.find((item) => item.assignmentId === assignmentId)
  const result = results.find((item) => item.assignmentId === assignmentId)
  const questionItems = buildQuestionItems({
    version,
    questions,
    session,
    reviews,
    assignmentId,
  })

  const base: ResultsDetailBase = {
    assignmentId,
    candidateName: candidate.fullName,
    vacancyId: vacancy.id,
    vacancyTitle: vacancy.title,
    testTitle: test.title,
    kind: test.kind,
    versionNumber: version.versionNumber,
    instructions: version.instructions,
    assignedAt: assignment.assignedAt,
    sessionStartedAt: session?.startedAt ?? null,
    sessionDeadlineAt: session?.deadlineAt ?? null,
    hasSession: Boolean(session),
  }

  if (!result) {
    return {
      ...base,
      outcome: "no_result",
      result: null,
      questions: questionItems,
    }
  }

  const categoryScores = result.categoryScores ?? null
  const dimensionScores = result.dimensionScores ?? null

  return {
    ...base,
    outcome: "with_result",
    result,
    listStatus: result.reviewStatus,
    questions: questionItems,
    categoryScores,
    dimensionScores,
    hasCategoryScores: Boolean(
      categoryScores && Object.keys(categoryScores).length > 0,
    ),
    hasDimensionScores: Boolean(
      dimensionScores && Object.keys(dimensionScores).length > 0,
    ),
  }
}

/** Chart points for category or dimension bars (0–100 for psycho axes). */
export function scoreChartPoints(
  scores: Record<string, number> | null | undefined,
): { name: string; value: number }[] {
  if (!scores) {
    return []
  }
  return Object.entries(scores).map(([name, value]) => ({ name, value }))
}
