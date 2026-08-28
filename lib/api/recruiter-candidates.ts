import {
  fetchHeaderPagedList,
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
