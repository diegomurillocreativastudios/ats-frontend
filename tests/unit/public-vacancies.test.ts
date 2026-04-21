import { describe, expect, it } from "vitest"
import {
  buildPublicVacanciesQuery,
  normalizeOpportunityDetail,
  normalizeOpportunityListResponse,
} from "@/lib/api/public-vacancies"

describe("public vacancies API helpers", () => {
  it("builds a stable query string from active filters", () => {
    expect(
      buildPublicVacanciesQuery({
        search: "react",
        departmentId: "dep-1",
        modalityId: "mod-1",
        page: 2,
      })
    ).toBe("?search=react&departmentId=dep-1&modalityId=mod-1&page=2")
  })

  it("normalizes paginated vacancies and availableFilters", () => {
    const response = normalizeOpportunityListResponse({
      data: [
        {
          id: "vac-1",
          title: "Senior React Developer",
          company: { id: "comp-1", name: "Creativa Studios" },
          countryCode: "sv",
          department: {
            id: "dep-1",
            code: "development",
            displayName: "Development",
          },
          modality: {
            id: "mod-1",
            code: "remote",
            displayName: "Remoto",
          },
          summary: "Build modern products",
        },
      ],
      availableFilters: {
        departments: [
          {
            id: "dep-1",
            code: "development",
            displayName: "Development",
            count: 12,
          },
        ],
        modalities: [
          {
            id: "mod-1",
            code: "remote",
            displayName: "Remoto",
            count: 8,
          },
        ],
      },
      page: 2,
      pageSize: 10,
      totalCount: 12,
      totalPages: 2,
    })

    expect(response.items).toHaveLength(1)
    expect(response.items[0].department?.displayName).toBe("Development")
    expect(response.items[0].modality?.displayName).toBe("Remoto")
    expect(response.items[0].countryCode).toBe("SV")
    expect(response.availableFilters.departments[0].count).toBe(12)
    expect(response.pagination.page).toBe(2)
    expect(response.pagination.totalPages).toBe(2)
  })

  it("normalizes detail arrays and falls back to description blocks", () => {
    const detail = normalizeOpportunityDetail({
      id: "vac-1",
      title: "UX Designer",
      companyName: "Creativa Studios",
      department: {
        id: "dep-2",
        code: "design",
        displayName: "Design",
      },
      modality: {
        id: "mod-2",
        code: "hybrid",
        displayName: "Híbrido",
      },
      description: "Diseña experiencias centradas en el usuario",
      responsibilities: ["Guiar discovery", "Prototipar flujos"],
      requirements: "Figma\nResearch",
      benefits: ["Horario flexible"],
    })

    expect(detail?.company.name).toBe("Creativa Studios")
    expect(detail?.department?.displayName).toBe("Design")
    expect(detail?.modality?.displayName).toBe("Híbrido")
    expect(detail?.responsibilities).toEqual([
      "Guiar discovery",
      "Prototipar flujos",
    ])
    expect(detail?.requirements).toEqual(["Figma", "Research"])
    expect(detail?.benefits).toEqual(["Horario flexible"])
  })
})
