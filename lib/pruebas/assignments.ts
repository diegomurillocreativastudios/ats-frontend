import { evaluateEligibility } from "@/lib/pruebas/eligibility"
import { partitionVacanciesForLinking } from "@/lib/pruebas/links"
import type {
  EligibilityReason,
  MockApplication,
  MockAssessmentLink,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockCandidateProfile,
  MockCompany,
  MockVacancy,
} from "@/lib/pruebas/types"

export { partitionVacanciesForLinking }

/** Demo default: invitations expire 14 days after MOCK_NOW. */
export const DEFAULT_ASSIGNMENT_EXPIRY_DAYS = 14

export interface AssignVersionOption {
  versionId: string
  linkId: string
  testId: string
  testTitle: string
  versionNumber: number
  label: string
}

export interface AssignCandidateRow {
  applicationId: string
  candidateProfileId: string
  fullName: string
  email: string
  stage: string
  status: MockApplication["status"]
  isEligible: boolean
  reason: EligibilityReason | null
}

/**
 * Active links for a vacancy whose version belongs to a published test.
 */
export function buildActiveLinkedVersionOptions(
  vacancyId: string,
  links: readonly MockAssessmentLink[],
  tests: readonly MockAssessmentTest[],
  versions: readonly MockAssessmentVersion[],
): AssignVersionOption[] {
  if (!vacancyId) {
    return []
  }

  const publishedTests = new Map(
    tests
      .filter((test) => test.lifecycleStatus === "published")
      .map((test) => [test.id, test]),
  )
  const versionById = new Map(versions.map((version) => [version.id, version]))

  return links
    .filter((link) => link.active && link.vacancyId === vacancyId)
    .map((link) => {
      const version = versionById.get(link.testVersionId)
      if (!version || !version.publishedAt) {
        return null
      }
      const test = publishedTests.get(version.testId)
      if (!test) {
        return null
      }
      return {
        versionId: version.id,
        linkId: link.id,
        testId: test.id,
        testTitle: test.title,
        versionNumber: version.versionNumber,
        label: `${test.title} · v${version.versionNumber}`,
      }
    })
    .filter((item): item is AssignVersionOption => item !== null)
    .sort((a, b) => {
      const titleCmp = a.testTitle.localeCompare(b.testTitle)
      if (titleCmp !== 0) return titleCmp
      return b.versionNumber - a.versionNumber
    })
}

/**
 * Applications for the selected vacancy only, classified with evaluateEligibility.
 * Candidates without an application for that vacancy are omitted.
 */
export function buildAssignmentCandidateRows(input: {
  vacancyId: string
  testVersionId: string
  applications: readonly MockApplication[]
  candidates: readonly MockCandidateProfile[]
  vacancies: readonly MockVacancy[]
  links: readonly MockAssessmentLink[]
  tests: readonly MockAssessmentTest[]
  versions: readonly MockAssessmentVersion[]
  assignments: readonly MockAssignment[]
}): AssignCandidateRow[] {
  const {
    vacancyId,
    testVersionId,
    applications,
    candidates,
    vacancies,
    links,
    tests,
    versions,
    assignments,
  } = input

  if (!vacancyId || !testVersionId) {
    return []
  }

  const vacancy = vacancies.find((item) => item.id === vacancyId)
  const version = versions.find((item) => item.id === testVersionId)
  const test = version
    ? tests.find((item) => item.id === version.testId)
    : undefined
  const link = links.find(
    (item) =>
      item.vacancyId === vacancyId && item.testVersionId === testVersionId,
  )
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  )

  if (!vacancy || !version || !test || !link) {
    return []
  }

  return applications
    .filter((application) => application.vacancyId === vacancyId)
    .map((application) => {
      const candidate = candidateById.get(application.candidateProfileId)
      const result = evaluateEligibility({
        application,
        vacancy,
        link,
        test,
        version,
        existingAssignments: assignments,
        targetVacancyId: vacancyId,
      })
      return {
        applicationId: application.id,
        candidateProfileId: application.candidateProfileId,
        fullName: candidate?.fullName ?? application.candidateProfileId,
        email: candidate?.email ?? "",
        stage: application.stage,
        status: application.status,
        isEligible: result.ok,
        reason: result.ok === false ? result.reason : null,
      }
    })
    .sort((a, b) => {
      if (a.isEligible !== b.isEligible) {
        return a.isEligible ? -1 : 1
      }
      return a.fullName.localeCompare(b.fullName)
    })
}

/** YYYY-MM-DD default expiry (now + 14 UTC days). */
export function defaultExpiresAtYmd(nowIso: string): string {
  const date = new Date(nowIso)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  date.setUTCDate(date.getUTCDate() + DEFAULT_ASSIGNMENT_EXPIRY_DAYS)
  return date.toISOString().slice(0, 10)
}

/** Combine a date-only value with the time-of-day from the demo clock. */
export function expiresAtIsoFromYmd(ymd: string, nowIso: string): string {
  const timePart = nowIso.includes("T") ? nowIso.slice(nowIso.indexOf("T") + 1) : "00:00:00.000Z"
  return `${ymd}T${timePart}`
}

export function isExpiresAtValid(ymd: string, nowIso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return false
  }
  const iso = expiresAtIsoFromYmd(ymd, nowIso)
  const expiresMs = Date.parse(iso)
  const nowMs = Date.parse(nowIso)
  if (Number.isNaN(expiresMs) || Number.isNaN(nowMs)) {
    return false
  }
  return expiresMs >= nowMs
}

export function isAllowedAttemptsValid(value: number): boolean {
  return Number.isInteger(value) && value >= 1
}

export function resolveCompanyName(
  vacancyId: string,
  vacancies: readonly MockVacancy[],
  companies: readonly MockCompany[],
): string | null {
  const vacancy = vacancies.find((item) => item.id === vacancyId)
  if (!vacancy) {
    return null
  }
  return (
    companies.find((company) => company.id === vacancy.companyId)?.name ??
    vacancy.companyId
  )
}
