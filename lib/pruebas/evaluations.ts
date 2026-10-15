import type {
  AssessmentKind,
  AssessmentLifecycleStatus,
  MockAssessmentLink,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockQuestion,
  MockVacancy,
} from "@/lib/pruebas/types"

export type EvaluationAction =
  | "view"
  | "edit"
  | "duplicate"
  | "publish"
  | "archive"
  | "versions"

export interface EvaluationListFilters {
  query: string
  kind: AssessmentKind | null
  lifecycleStatus: AssessmentLifecycleStatus | null
}

export const EVALUATION_ACTIONS_BY_STATUS: Record<
  AssessmentLifecycleStatus,
  readonly EvaluationAction[]
> = {
  draft: ["view", "edit", "duplicate", "publish", "archive", "versions"],
  published: ["view", "duplicate", "archive", "versions"],
  archived: ["view", "duplicate", "versions"],
} as const

export function getEvaluationActions(
  status: AssessmentLifecycleStatus,
): readonly EvaluationAction[] {
  return EVALUATION_ACTIONS_BY_STATUS[status]
}

export function canPerformEvaluationAction(
  status: AssessmentLifecycleStatus,
  action: EvaluationAction,
): boolean {
  return getEvaluationActions(status).includes(action)
}

export function filterEvaluations(
  tests: readonly MockAssessmentTest[],
  filters: EvaluationListFilters,
): MockAssessmentTest[] {
  const query = filters.query.trim().toLowerCase()
  return tests
    .filter((test) => {
      if (filters.kind && test.kind !== filters.kind) return false
      if (
        filters.lifecycleStatus &&
        test.lifecycleStatus !== filters.lifecycleStatus
      ) {
        return false
      }
      if (query && !test.title.toLowerCase().includes(query)) return false
      return true
    })
    .sort((a, b) => {
      if (a.createdAt === b.createdAt) {
        return a.title.localeCompare(b.title)
      }
      return a.createdAt < b.createdAt ? 1 : -1
    })
}

export function paginateEvaluations<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}

/**
 * Draft unpublished version if present; otherwise highest published version.
 */
export function resolveCurrentVersion(
  versions: readonly MockAssessmentVersion[],
  testId: string,
): MockAssessmentVersion | null {
  const forTest = versions.filter((version) => version.testId === testId)
  const draft = forTest.find((version) => version.publishedAt === undefined)
  if (draft) return draft
  const published = [...forTest]
    .filter((version) => version.publishedAt)
    .sort((a, b) => b.versionNumber - a.versionNumber)
  return published[0] ?? null
}

export function sortVersionsDesc(
  versions: readonly MockAssessmentVersion[],
): MockAssessmentVersion[] {
  return [...versions].sort((a, b) => {
    if (a.publishedAt === undefined && b.publishedAt !== undefined) return -1
    if (a.publishedAt !== undefined && b.publishedAt === undefined) return 1
    return b.versionNumber - a.versionNumber
  })
}

export function resolveQuestionsForVersion(
  version: MockAssessmentVersion | null,
  questions: readonly MockQuestion[],
): MockQuestion[] {
  if (!version) return []
  const byId = new Map(questions.map((question) => [question.id, question]))
  return version.questionIds
    .map((id) => byId.get(id))
    .filter((question): question is MockQuestion => Boolean(question))
}

export interface EvaluationLinkRow {
  link: MockAssessmentLink
  vacancyTitle: string
}

export function resolveLinksForTest(
  testId: string,
  versions: readonly MockAssessmentVersion[],
  links: readonly MockAssessmentLink[],
  vacancies: readonly MockVacancy[],
): EvaluationLinkRow[] {
  const versionIds = new Set(
    versions.filter((version) => version.testId === testId).map((v) => v.id),
  )
  const vacancyById = new Map(vacancies.map((vacancy) => [vacancy.id, vacancy]))
  return links
    .filter((link) => versionIds.has(link.testVersionId))
    .map((link) => ({
      link,
      vacancyTitle: vacancyById.get(link.vacancyId)?.title ?? link.vacancyId,
    }))
}

export function questionPointsOrDimension(question: MockQuestion): string | number {
  switch (question.kind) {
    case "likert":
      return question.dimension
    case "open":
      return question.maxPoints
    case "single_choice":
    case "multiple_choice":
    case "true_false":
    case "numeric":
      return question.points
  }
}
