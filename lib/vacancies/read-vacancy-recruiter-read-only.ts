import { readCompanyIsActiveForVacancy, type CompanyActiveLookup } from "@/lib/vacancies/read-company-is-active"
import { readVacancyIsActive } from "@/lib/vacancies/read-vacancy-is-active"

export type VacancyRecruiterReadOnlyReason = "vacancy" | "company" | "done" | null

function readVacancyIsDone(vacancy: unknown): boolean {
  if (vacancy == null || typeof vacancy !== "object") return false
  const record = vacancy as Record<string, unknown>
  return record.isVacancyDone === true || record.is_vacancy_done === true
}

function readVacancyReadOnlyFlag(vacancy: unknown): boolean {
  if (vacancy == null || typeof vacancy !== "object") return false
  const record = vacancy as Record<string, unknown>
  return record.readOnly === true || record.read_only === true
}

export function getVacancyRecruiterReadOnlyReason(
  vacancy: unknown,
  companies: CompanyActiveLookup[] = []
): VacancyRecruiterReadOnlyReason {
  if (vacancy == null) return null
  if (readVacancyReadOnlyFlag(vacancy)) {
    if (readVacancyIsDone(vacancy)) return "done"
    if (!readCompanyIsActiveForVacancy(vacancy, companies)) return "company"
    if (!readVacancyIsActive(vacancy)) return "vacancy"
    return "vacancy"
  }
  if (readVacancyIsDone(vacancy)) return "done"
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
  if (reason === "done") return "Proceso finalizado: solo lectura"
  if (reason === "company") return "Empresa inactiva: solo lectura"
  if (reason === "vacancy") return "Vacante inactiva: solo lectura"
  return undefined
}
