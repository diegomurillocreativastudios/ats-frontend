import { apiClient } from "@/lib/api"
import {
  readTechnicalSheetCompanyBrandFromVacancy,
  type TechnicalSheetCompanyBrand,
} from "@/lib/technical-sheet/vacancy-company-brand"

/**
 * Loads company brand for a vacancy technical-sheet preview (client / BFF).
 * Failures return null so the sheet still renders with ApplicanTree only.
 */
export async function fetchVacancyCompanyBrandForTechnicalSheet(
  vacancyId: string
): Promise<TechnicalSheetCompanyBrand | null> {
  const id = String(vacancyId ?? "").trim()
  if (!id) return null
  try {
    const raw = await apiClient.get(
      `/api/recruiter/vacancies/${encodeURIComponent(id)}`
    )
    return readTechnicalSheetCompanyBrandFromVacancy(raw)
  } catch {
    return null
  }
}
