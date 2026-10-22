import { apiClient } from "@/lib/api"
import {
  fetchHeaderPagedList,
  unwrapListArray,
  type HeaderPagedResult,
} from "@/lib/api/query-paging"

const CANDIDATES_ALL_PATH = "/api/recruiter/candidates/all"

export async function listRecruiterCandidatesAll(
  params: {
    page?: number
    pageSize?: number
  } = {}
): Promise<HeaderPagedResult<unknown>> {
  return fetchHeaderPagedList(CANDIDATES_ALL_PATH, params)
}

/** Full list for recruiter search. No page or pageSize query. */
export async function listRecruiterCandidatesUnpaged(): Promise<unknown[]> {
  const data = await apiClient.get(CANDIDATES_ALL_PATH)
  return unwrapListArray(data)
}
