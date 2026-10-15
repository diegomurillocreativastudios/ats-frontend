import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  QUERY_FETCH_ALL_PAGE_SIZE,
  fetchAllHeaderPagedList,
  fetchHeaderPagedList,
  type HeaderPagedResult,
} from "@/lib/api/query-paging"

const RECRUITER_VACANCIES_PATH = "/api/recruiter/vacancies"

export interface ListRecruiterVacanciesQuery {
  page?: number
  pageSize?: number
  vacancyTypeId?: string
  presentationOverdue?: boolean
  presentationDueWithinDays?: number
}

function buildRecruiterVacanciesPath(query: ListRecruiterVacanciesQuery = {}): string {
  const search = new URLSearchParams()
  const vacancyTypeId = query.vacancyTypeId?.trim()
  if (vacancyTypeId) search.set("vacancyTypeId", vacancyTypeId)
  if (query.presentationOverdue === true) {
    search.set("presentationOverdue", "true")
  }
  if (
    query.presentationDueWithinDays != null &&
    Number.isFinite(query.presentationDueWithinDays) &&
    query.presentationDueWithinDays > 0
  ) {
    search.set(
      "presentationDueWithinDays",
      String(Math.floor(query.presentationDueWithinDays))
    )
  }
  const qs = search.toString()
  return qs === "" ? RECRUITER_VACANCIES_PATH : `${RECRUITER_VACANCIES_PATH}?${qs}`
}

export async function listRecruiterVacanciesPage(
  params: ListRecruiterVacanciesQuery = {}
): Promise<HeaderPagedResult<unknown>> {
  const { page, pageSize, ...filters } = params
  return fetchHeaderPagedList(buildRecruiterVacanciesPath(filters), {
    page,
    pageSize,
  })
}

export async function listAllRecruiterVacancies(): Promise<unknown[]> {
  return fetchAllHeaderPagedList(
    RECRUITER_VACANCIES_PATH,
    QUERY_FETCH_ALL_PAGE_SIZE
  )
}

/** User-facing message for company PATCH failures. */
export function mapVacancyCompanyPatchError(payload: unknown): string {
  const raw = getApiErrorMessage(payload).trim()
  const lower = raw.toLowerCase()
  if (lower.includes("company not found")) {
    return "La empresa cliente seleccionada no existe o fue eliminada."
  }
  if (lower.includes("company is not active") || lower.includes("not active")) {
    return "La empresa cliente seleccionada está inactiva. Elige otra del listado."
  }
  if (raw && raw !== "Error desconocido") return raw
  return "No se pudo actualizar la empresa cliente de la vacante."
}

/** Updates only the client company on a vacancy (`PATCH { companyId }`). */
export async function patchVacancyClientCompany(
  vacancyId: string,
  companyId: string
): Promise<unknown> {
  const id = String(vacancyId ?? "").trim()
  const company = String(companyId ?? "").trim()
  if (!id || !company) {
    throw new Error("Faltan el id de la vacante o la empresa cliente.")
  }
  return apiClient.patch(`/api/recruiter/vacancies/${encodeURIComponent(id)}`, {
    companyId: company,
  })
}

/**
 * Publishes or unpublishes a vacancy on the public portal (`PATCH { isPublished }`).
 * Never combine with other fields: omitting `isPublished` elsewhere keeps the current value.
 */
export async function patchVacancyIsPublished(
  vacancyId: string,
  isPublished: boolean
): Promise<unknown> {
  const id = String(vacancyId ?? "").trim()
  if (!id) {
    throw new Error("Falta el id de la vacante.")
  }
  return apiClient.patch(`/api/recruiter/vacancies/${encodeURIComponent(id)}`, {
    isPublished,
  })
}

/** Whether a vacancy mutation failed because the vacancy is finished or read-only. */
export function isVacancyReadOnlyConflict(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false
  return (error as { status?: unknown }).status === 409
}
