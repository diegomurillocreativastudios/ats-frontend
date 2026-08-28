import {
  QUERY_FETCH_ALL_PAGE_SIZE,
  fetchAllHeaderPagedList,
  fetchHeaderPagedList,
  type HeaderPagedResult,
} from "@/lib/api/query-paging"
import { unwrapVacancyDetailPayload } from "@/lib/vacancies/normalize-vacancy-detail-from-api"

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
