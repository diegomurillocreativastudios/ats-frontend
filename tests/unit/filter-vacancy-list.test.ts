import { describe, expect, it } from "vitest"
import {
  EMPTY_VACANCY_LIST_FILTERS,
  filterVacancyList,
  hasActiveVacancyListFilters,
} from "@/lib/vacancies/filter-vacancy-list"
import type { VacancyListItem } from "@/lib/vacancies/map-vacancy-list-item"

const baseVacancy = (overrides: Partial<VacancyListItem>): VacancyListItem => ({
  id: "v1",
  title: "Sales Agent",
  description: "",
  company: "Creativa Studios",
  companyId: "co-1",
  jobCategory: "—",
  department: "Ventas",
  departmentId: "11111111-1111-1111-1111-111111111111",
  modality: "Presencial",
  modalityId: "22222222-2222-2222-2222-222222222222",
  location: "—",
  requirementsSummary: "",
  requirementsRaw: null,
  candidates: 2,
  interviews: null,
  status: "activa",
  statusRaw: "Open",
  iconKey: "briefcase",
  needsRematch: false,
  createdAt: null,
  createdAtLabel: null,
  countryCode: "SV",
  countryLabel: "El Salvador",
  stateCode: null,
  ...overrides,
})

describe("filterVacancyList", () => {
  const items = [
    baseVacancy({ id: "v1", title: "Sales Agent" }),
    baseVacancy({
      id: "v2",
      title: "UX Designer",
      companyId: "co-2",
      company: "Otra Empresa",
      departmentId: "33333333-3333-3333-3333-333333333333",
      department: "Diseño",
      modalityId: "44444444-4444-4444-4444-444444444444",
      modality: "Remoto",
      countryCode: "MX",
      countryLabel: "México",
    }),
  ]

  it("filters by title only", () => {
    const result = filterVacancyList(items, {
      ...EMPTY_VACANCY_LIST_FILTERS,
      titleQuery: "ux",
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe("UX Designer")
  })

  it("filters by company, modality, country and department", () => {
    const result = filterVacancyList(items, {
      titleQuery: "",
      companyId: "co-1",
      modalityId: "22222222-2222-2222-2222-222222222222",
      countryCode: "SV",
      departmentId: "11111111-1111-1111-1111-111111111111",
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("v1")
  })
})

describe("hasActiveVacancyListFilters", () => {
  it("detects active filters", () => {
    expect(hasActiveVacancyListFilters(EMPTY_VACANCY_LIST_FILTERS)).toBe(false)
    expect(
      hasActiveVacancyListFilters({
        ...EMPTY_VACANCY_LIST_FILTERS,
        countryCode: "SV",
      })
    ).toBe(true)
  })
})
