import { isVacancyClosed } from "@/lib/pruebas/eligibility"
import type {
  MockAssessmentLink,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockCompany,
  MockVacancy,
} from "@/lib/pruebas/types"

export interface LinkVersionOption {
  versionId: string
  testId: string
  testTitle: string
  versionNumber: number
  label: string
}

export interface LinkVacancyOption {
  vacancyId: string
  title: string
  companyId: string
  companyName: string
}

export interface ExcludedVacancyNote {
  vacancyId: string
  title: string
  reason: "closed"
}

export interface LinkListRow {
  link: MockAssessmentLink
  testTitle: string
  versionNumber: number
  vacancyTitle: string
  companyName: string
}

/**
 * Published versions of published tests only, newest version number first.
 */
export function buildPublishedVersionOptions(
  tests: readonly MockAssessmentTest[],
  versions: readonly MockAssessmentVersion[],
): LinkVersionOption[] {
  const publishedTests = new Map(
    tests
      .filter((test) => test.lifecycleStatus === "published")
      .map((test) => [test.id, test]),
  )
  return versions
    .filter(
      (version) =>
        Boolean(version.publishedAt) && publishedTests.has(version.testId),
    )
    .map((version) => {
      const test = publishedTests.get(version.testId)!
      return {
        versionId: version.id,
        testId: test.id,
        testTitle: test.title,
        versionNumber: version.versionNumber,
        label: `${test.title} · v${version.versionNumber}`,
      }
    })
    .sort((a, b) => {
      const titleCmp = a.testTitle.localeCompare(b.testTitle)
      if (titleCmp !== 0) return titleCmp
      return b.versionNumber - a.versionNumber
    })
}

export function partitionVacanciesForLinking(
  vacancies: readonly MockVacancy[],
  companies: readonly MockCompany[],
): {
  open: LinkVacancyOption[]
  excluded: ExcludedVacancyNote[]
} {
  const companyById = new Map(
    companies.map((company) => [company.id, company]),
  )
  const open: LinkVacancyOption[] = []
  const excluded: ExcludedVacancyNote[] = []

  for (const vacancy of vacancies) {
    if (isVacancyClosed(vacancy)) {
      excluded.push({
        vacancyId: vacancy.id,
        title: vacancy.title,
        reason: "closed",
      })
      continue
    }
    open.push({
      vacancyId: vacancy.id,
      title: vacancy.title,
      companyId: vacancy.companyId,
      companyName: companyById.get(vacancy.companyId)?.name ?? vacancy.companyId,
    })
  }

  open.sort((a, b) => a.title.localeCompare(b.title))
  excluded.sort((a, b) => a.title.localeCompare(b.title))
  return { open, excluded }
}

export function buildLinkListRows(
  links: readonly MockAssessmentLink[],
  tests: readonly MockAssessmentTest[],
  versions: readonly MockAssessmentVersion[],
  vacancies: readonly MockVacancy[],
  companies: readonly MockCompany[],
): LinkListRow[] {
  const testById = new Map(tests.map((test) => [test.id, test]))
  const versionById = new Map(versions.map((version) => [version.id, version]))
  const vacancyById = new Map(vacancies.map((vacancy) => [vacancy.id, vacancy]))
  const companyById = new Map(
    companies.map((company) => [company.id, company]),
  )

  return [...links]
    .map((link) => {
      const version = versionById.get(link.testVersionId)
      const test = version ? testById.get(version.testId) : undefined
      const vacancy = vacancyById.get(link.vacancyId)
      const company = vacancy
        ? companyById.get(vacancy.companyId)
        : undefined
      return {
        link,
        testTitle: test?.title ?? link.testVersionId,
        versionNumber: version?.versionNumber ?? 0,
        vacancyTitle: vacancy?.title ?? link.vacancyId,
        companyName: company?.name ?? vacancy?.companyId ?? "",
      }
    })
    .sort((a, b) => b.link.linkedAt.localeCompare(a.link.linkedAt))
}

/**
 * Latest published version for a test (highest versionNumber with publishedAt).
 * Ignores unpublished drafts that resolveCurrentVersion prefers.
 */
export function resolveLatestPublishedVersionId(
  testId: string,
  versions: readonly MockAssessmentVersion[],
): string | null {
  const published = versions
    .filter(
      (version) => version.testId === testId && Boolean(version.publishedAt),
    )
    .sort((a, b) => b.versionNumber - a.versionNumber)
  return published[0]?.id ?? null
}
