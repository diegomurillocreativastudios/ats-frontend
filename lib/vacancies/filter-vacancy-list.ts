import type { VacancyListItem } from "@/lib/vacancies/map-vacancy-list-item"

export interface VacancyListFilters {
  titleQuery: string
  companyId: string
  modalityId: string
  countryCode: string
  departmentId: string
}

export const EMPTY_VACANCY_LIST_FILTERS: VacancyListFilters = {
  titleQuery: "",
  companyId: "",
  modalityId: "",
  countryCode: "",
  departmentId: "",
}

export const hasActiveVacancyListFilters = (filters: VacancyListFilters): boolean =>
  Boolean(
    filters.titleQuery.trim() ||
      filters.companyId ||
      filters.modalityId ||
      filters.countryCode ||
      filters.departmentId
  )

export const filterVacancyList = (
  items: VacancyListItem[],
  filters: VacancyListFilters
): VacancyListItem[] => {
  const titleQuery = filters.titleQuery.trim().toLowerCase()

  return items.filter((vacancy) => {
    if (titleQuery && !vacancy.title.toLowerCase().includes(titleQuery)) {
      return false
    }

    if (filters.companyId) {
      const matchesId = vacancy.companyId === filters.companyId
      if (!matchesId) return false
    }

    if (filters.modalityId && vacancy.modalityId !== filters.modalityId) {
      return false
    }

    if (filters.departmentId && vacancy.departmentId !== filters.departmentId) {
      return false
    }

    if (filters.countryCode && vacancy.countryCode !== filters.countryCode) {
      return false
    }

    return true
  })
}
