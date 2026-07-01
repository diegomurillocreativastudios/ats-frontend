import { apiClient } from "@/lib/api"
import {
  normalizeProfileVersionDetail,
  normalizeProfileVersionSummaryList,
  normalizeTailorToVacancyResult,
  type ProfileVersionDetail,
  type ProfileVersionPatchBody,
  type ProfileVersionSummary,
  type TailorToVacancyResult,
} from "@/lib/candidate-profile-version"
import type { VacancySourceInput } from "@/lib/profile-tailoring-vacancy-source"

export interface ListProfileVersionsParams {
  page?: number
  pageSize?: number
}

export interface TailorToVacancyInput {
  source: VacancySourceInput
  label?: string | null
  vacancyTitle?: string | null
}

function buildTailorFormData(input: TailorToVacancyInput): FormData {
  const formData = new FormData()
  const { source } = input
  if (source.kind === "file") {
    formData.append("vacancyFile", source.file)
  } else if (source.kind === "text") {
    formData.append("vacancyText", source.text)
  } else {
    formData.append("vacancyId", source.vacancyId)
  }
  if (input.label?.trim()) {
    formData.append("label", input.label.trim())
  }
  if (source.kind === "platform" && input.vacancyTitle?.trim()) {
    formData.append("vacancyTitle", input.vacancyTitle.trim())
  }
  return formData
}

export async function tailorProfileToVacancy(
  input: TailorToVacancyInput
): Promise<TailorToVacancyResult> {
  const raw = await apiClient.postFormData(
    "/api/candidate/profile/tailor-to-vacancy",
    buildTailorFormData(input)
  )
  const result = normalizeTailorToVacancyResult(raw)
  if (!result) {
    throw new Error("Respuesta inválida del servidor al adecuar el perfil.")
  }
  return result
}

export async function listProfileVersions(
  params: ListProfileVersionsParams = {}
): Promise<ProfileVersionSummary[]> {
  const search = new URLSearchParams()
  if (params.page != null && params.page > 0) {
    search.set("page", String(params.page))
  }
  if (params.pageSize != null && params.pageSize > 0) {
    search.set("pageSize", String(params.pageSize))
  }
  const query = search.toString()
  const raw = await apiClient.get(
    `/api/candidate/profile/versions${query ? `?${query}` : ""}`
  )
  return normalizeProfileVersionSummaryList(raw)
}

export async function getProfileVersion(versionId: string): Promise<ProfileVersionDetail> {
  const raw = await apiClient.get(
    `/api/candidate/profile/versions/${encodeURIComponent(versionId)}`
  )
  const detail = normalizeProfileVersionDetail(raw)
  if (!detail) {
    throw new Error("No se pudo cargar la versión del perfil.")
  }
  return detail
}

export async function patchProfileVersion(
  versionId: string,
  body: ProfileVersionPatchBody
): Promise<ProfileVersionDetail> {
  const raw = await apiClient.patch(
    `/api/candidate/profile/versions/${encodeURIComponent(versionId)}`,
    body
  )
  const detail = normalizeProfileVersionDetail(raw)
  if (!detail) {
    throw new Error("No se pudo actualizar la versión del perfil.")
  }
  return detail
}

export async function deleteProfileVersion(versionId: string): Promise<void> {
  await apiClient.delete(
    `/api/candidate/profile/versions/${encodeURIComponent(versionId)}`
  )
}
