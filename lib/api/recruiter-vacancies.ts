import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

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
