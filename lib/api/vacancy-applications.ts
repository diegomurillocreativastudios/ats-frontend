import {
  QUERY_FETCH_ALL_PAGE_SIZE,
  fetchAllHeaderPagedList,
  fetchHeaderPagedList,
  type HeaderPagedResult,
} from "@/lib/api/query-paging"
import { unwrapVacancyDetailPayload } from "@/lib/vacancies/normalize-vacancy-detail-from-api"

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickString(
  raw: Record<string, unknown> | null,
  keys: string[]
): string | null {
  if (!raw) return null
  for (const key of keys) {
    const value = raw[key]
    if (value != null && String(value).trim() !== "") {
      return String(value).trim()
    }
  }
  return null
}

function readArrayField(
  root: Record<string, unknown>,
  keys: string[]
): unknown[] {
  for (const key of keys) {
    const value = root[key]
    if (Array.isArray(value)) return value
  }
  return []
}

/** Id de postulación para un candidato dentro de `applicants` de la vacante. */
export function findApplicationIdForCandidate(
  applicants: unknown[],
  candidateProfileId: string
): string | null {
  const wanted = candidateProfileId.trim()
  if (!wanted) return null
  for (const item of applicants) {
    const row = asRecord(item)
    const profileId = pickString(row, [
      "candidateProfileId",
      "candidate_profile_id",
    ])
    if (profileId !== wanted) continue
    const applicationId = pickString(row, ["applicationId", "application_id"])
    if (applicationId) return applicationId
  }
  return null
}

export async function resolveApplicationIdForCandidate(
  vacancyId: string,
  candidateProfileId: string
): Promise<string | null> {
  if (!vacancyId.trim() || !candidateProfileId.trim()) return null
  try {
    const applicants = await listAllVacancyApplications(vacancyId)
    return findApplicationIdForCandidate(applicants, candidateProfileId)
  } catch {
    return null
  }
}

function applicationsPath(vacancyId: string): string {
  return `/api/recruiter/vacancies/${encodeURIComponent(vacancyId)}/applications`
}

export async function listVacancyApplications(
  vacancyId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<HeaderPagedResult<unknown>> {
  return fetchHeaderPagedList(applicationsPath(vacancyId), params)
}

export async function listAllVacancyApplications(
  vacancyId: string
): Promise<unknown[]> {
  return fetchAllHeaderPagedList(
    applicationsPath(vacancyId),
    QUERY_FETCH_ALL_PAGE_SIZE
  )
}

/**
 * Index rich GetVacancy match rows (applicants + aiMatchSuggestions) so
 * `/applications` overlay can keep IA analysis while taking stage/status from apps.
 */
export function indexRichVacancyMatchRows(
  root: Record<string, unknown>
): {
  byApplicationId: Map<string, Record<string, unknown>>
  byProfileId: Map<string, Record<string, unknown>>
} {
  const byApplicationId = new Map<string, Record<string, unknown>>()
  const byProfileId = new Map<string, Record<string, unknown>>()

  const richRows = [
    ...readArrayField(root, ["applicants", "Applicants"]),
    ...readArrayField(root, [
      "aiMatchSuggestions",
      "AiMatchSuggestions",
      "matches",
      "Matches",
    ]),
  ]

  for (const item of richRows) {
    const row = asRecord(item)
    if (!row) continue
    const applicationId = pickString(row, [
      "applicationId",
      "application_id",
      "ApplicationId",
    ])
    const profileId = pickString(row, [
      "candidateProfileId",
      "candidate_profile_id",
      "CandidateProfileId",
    ])
    if (applicationId && !byApplicationId.has(applicationId)) {
      byApplicationId.set(applicationId, row)
    }
    if (profileId && !byProfileId.has(profileId)) {
      byProfileId.set(profileId, row)
    }
  }

  return { byApplicationId, byProfileId }
}

/**
 * Merge slim ApplicationDto over a rich CandidateMatchDto when available.
 * Application fields (stage, status, interview flags, score) win; analysis fields
 * from GetVacancy are preserved when the applications list omits them.
 */
export function mergeApplicationWithRichMatch(
  applicationRow: unknown,
  richIndex: {
    byApplicationId: Map<string, Record<string, unknown>>
    byProfileId: Map<string, Record<string, unknown>>
  }
): Record<string, unknown> {
  const app = asRecord(applicationRow) ?? {}
  const applicationId = pickString(app, [
    "applicationId",
    "application_id",
    "ApplicationId",
    "id",
    "Id",
  ])
  const profileId = pickString(app, [
    "candidateProfileId",
    "candidate_profile_id",
    "CandidateProfileId",
  ])

  const rich =
    (applicationId ? richIndex.byApplicationId.get(applicationId) : undefined) ??
    (profileId ? richIndex.byProfileId.get(profileId) : undefined)

  if (!rich) return { ...app }
  return { ...rich, ...app }
}

/**
 * Overlays paginated applications onto vacancy detail while preserving match
 * analysis from GetVacancy (`applicants` + `aiMatchSuggestions`).
 * Falls back to the original payload if the applications request fails.
 */
export async function overlayVacancyApplicants(
  vacancyId: string,
  vacancyPayload: unknown
): Promise<unknown> {
  try {
    const applications = await listAllVacancyApplications(vacancyId)
    const root = unwrapVacancyDetailPayload(vacancyPayload)
    if (!root) return { applicants: applications }

    const richIndex = indexRichVacancyMatchRows(root)
    const applicants = applications.map((row) =>
      mergeApplicationWithRichMatch(row, richIndex)
    )

    return { ...root, applicants, Applicants: applicants }
  } catch {
    return vacancyPayload
  }
}
