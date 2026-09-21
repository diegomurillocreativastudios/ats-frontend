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
 * Replaces nested `applicants` with the paginated applications list.
 * Falls back to the original payload if the applications request fails.
 */
export async function overlayVacancyApplicants(
  vacancyId: string,
  vacancyPayload: unknown
): Promise<unknown> {
  try {
    const applicants = await listAllVacancyApplications(vacancyId)
    const root = unwrapVacancyDetailPayload(vacancyPayload)
    if (!root) return { applicants }
    return { ...root, applicants, Applicants: applicants }
  } catch {
    return vacancyPayload
  }
}
