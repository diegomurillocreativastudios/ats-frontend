import { readCompanyIsActiveForVacancy, type CompanyActiveLookup } from "@/lib/vacancies/read-company-is-active"
import { readVacancyIsActive } from "@/lib/vacancies/read-vacancy-is-active"

export type VacancyRecruiterReadOnlyReason = "vacancy" | "company" | null

export function getVacancyRecruiterReadOnlyReason(
  vacancy: unknown,
  companies: CompanyActiveLookup[] = []
): VacancyRecruiterReadOnlyReason {
  if (vacancy == null) return null
  if (!readCompanyIsActiveForVacancy(vacancy, companies)) return "company"
  if (!readVacancyIsActive(vacancy)) return "vacancy"
  return null
}

export function isVacancyRecruiterReadOnly(
  vacancy: unknown,
  companies: CompanyActiveLookup[] = []
): boolean {
  return getVacancyRecruiterReadOnlyReason(vacancy, companies) != null
}

export function vacancyRecruiterReadOnlyTitle(
  reason: VacancyRecruiterReadOnlyReason
): string | undefined {
  if (reason === "company") return "Empresa inactiva: solo lectura"
  if (reason === "vacancy") return "Vacante inactiva: solo lectura"
  return undefined
}
