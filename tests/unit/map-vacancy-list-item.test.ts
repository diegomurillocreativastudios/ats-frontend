import { describe, expect, it } from "vitest"
import {
  formatRequirementsSummary,
  mapStatusKey,
  mapVacancyFromApi,
} from "@/lib/vacancies/map-vacancy-list-item"

describe("mapVacancyFromApi", () => {
  it("maps full recruiter vacancy payload for list display", () => {
    const item = mapVacancyFromApi({
      id: "vac-1",
      title: "Sales Agent",
      description: "Sales Agent role",
      status: "Open",
      createdAt: "2026-04-29T10:00:00.000Z",
      jobCategory: "Uncategorized",
      companyId: "co-1",
      company: "Creativa Studios",
      countryCode: "SV",
      stateCode: "SS",
      requirements: { experience: "2+ years", language: "English" },
      needsRematch: false,
      candidatesAmount: 2,
      vacancyDepartmentId: "11111111-1111-1111-1111-111111111111",
      vacancyDepartment: {
        id: "11111111-1111-1111-1111-111111111111",
        displayName: "Ventas",
      },
      vacancyModalityId: "22222222-2222-2222-2222-222222222222",
      vacancyModality: {
        id: "22222222-2222-2222-2222-222222222222",
        displayName: "Presencial",
      },
    })

    expect(item.id).toBe("vac-1")
    expect(item.title).toBe("Sales Agent")
    expect(item.company).toBe("Creativa Studios")
    expect(item.companyId).toBe("co-1")
    expect(item.jobCategory).toBe("Uncategorized")
    expect(item.department).toBe("Ventas")
    expect(item.departmentId).toBe("11111111-1111-1111-1111-111111111111")
    expect(item.modality).toBe("Presencial")
    expect(item.modalityId).toBe("22222222-2222-2222-2222-222222222222")
    expect(item.countryCode).toBe("SV")
    expect(item.stateCode).toBe("SS")
    expect(item.candidates).toBe(2)
    expect(item.status).toBe("activa")
    expect(item.statusRaw).toBe("Open")
    expect(item.requirementsSummary).toContain("experience: 2+ years")
    expect(item.createdAtLabel).toBeTruthy()
    expect(item.isActive).toBe(true)
  })

  it("maps inactive vacancies for read-only list display", () => {
    const item = mapVacancyFromApi({
      id: "vac-inactive",
      title: "Legacy role",
      isActive: false,
    })

    expect(item.isActive).toBe(false)
  })

  it("marks vacancy read-only when company is inactive", () => {
    const item = mapVacancyFromApi({
      id: "vac-co-inactive",
      title: "Sales Agent",
      isActive: true,
      companyIsActive: false,
    })

    expect(item.isActive).toBe(false)
  })
})

describe("formatRequirementsSummary", () => {
  it("joins object entries", () => {
    expect(
      formatRequirementsSummary({ skill: "React", years: 3 })
    ).toBe("skill: React · years: 3")
  })
})

describe("mapStatusKey", () => {
  it("normalizes open status", () => {
    expect(mapStatusKey({ status: "Open" })).toBe("activa")
  })
})
