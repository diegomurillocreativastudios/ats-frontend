import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  DEFAULT_RECRUITER_COMPANY_ID,
  listRecruiterCompanies,
  listCompanyVacancyStatuses,
  listRecruiterStages,
  listCompanyApplicantStatuses,
  resolveVacancyCompanyId,
  persistVacancyCompanyId,
  readPersistedVacancyCompanyId,
  adminStagesCatalogHref,
  type RecruiterCompanyOption,
} from "@/lib/api/recruiter-companies"

const apiGet = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
  },
}))

describe("resolveVacancyCompanyId", () => {
  const companies: RecruiterCompanyOption[] = [
    { id: "00000000-0000-0000-0000-000000000001", name: "Applican Tree", isActive: true },
    { id: "company-b-id", name: "Acme Corp", isActive: true },
  ]

  it("returns companyId from vacancy when present", () => {
    expect(
      resolveVacancyCompanyId({ companyId: "company-b-id", company: "Acme Corp" }, companies)
    ).toBe("company-b-id")
  })

  it("resolves companyId by matching company display name", () => {
    expect(resolveVacancyCompanyId({ company: "Acme Corp" }, companies)).toBe("company-b-id")
  })

  it("falls back to default company id when unresolved", () => {
    expect(resolveVacancyCompanyId({ company: "Unknown LLC" }, companies)).toBe(
      DEFAULT_RECRUITER_COMPANY_ID
    )
  })

  it("reads persisted company id for vacancy when API omits companyId", () => {
    persistVacancyCompanyId("vac-42", "company-b-id")
    expect(resolveVacancyCompanyId({ company: "Acme Corp" }, companies, "vac-42")).toBe(
      "company-b-id"
    )
    expect(readPersistedVacancyCompanyId("vac-42")).toBe("company-b-id")
  })

  it("prefers API companyId over persisted session value", () => {
    persistVacancyCompanyId("vac-99", "company-b-id")
    expect(
      resolveVacancyCompanyId(
        {
          companyId: "00000000-0000-0000-0000-000000000001",
          company: "Applican Tree",
        },
        companies,
        "vac-99"
      )
    ).toBe("00000000-0000-0000-0000-000000000001")
  })
})

describe("adminStagesCatalogHref", () => {
  it("returns the global stages admin path without company query", () => {
    expect(adminStagesCatalogHref("company-b-id")).toBe(
      "/portal-admin/vacantes/etapas"
    )
    expect(adminStagesCatalogHref()).toBe("/portal-admin/vacantes/etapas")
  })
})

describe("listRecruiterCompanies", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("calls GET /api/recruiter/companies and maps id and name", async () => {
    apiGet.mockResolvedValueOnce([
      { id: "a", name: "Alpha" },
      { id: "b", name: "Default Company" },
    ])

    const result = await listRecruiterCompanies()

    expect(apiGet).toHaveBeenCalledWith("/api/recruiter/companies")
    expect(result).toEqual([
      { id: "a", name: "Alpha", isActive: true },
      { id: "b", name: "Default Company", isActive: true },
    ])
  })
})

describe("listRecruiterStages", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("calls the global stages endpoint", async () => {
    apiGet.mockResolvedValueOnce([
      { id: "s1", name: "Applied", orderIndex: 1 },
      { id: "s0", name: "Sourced", orderIndex: 0 },
    ])

    const result = await listRecruiterStages()

    expect(apiGet).toHaveBeenCalledWith("/api/recruiter/stages")
    expect(result.map((s) => s.name)).toEqual(["Sourced", "Applied"])
  })

  it("maps final and isHiredStage from the catalog payload", async () => {
    apiGet.mockResolvedValueOnce([
      {
        id: "hired",
        name: "Hired",
        orderIndex: 1,
        final: true,
        isHiredStage: true,
      },
      {
        id: "reject",
        name: "No seleccionado",
        orderIndex: 2,
        final: true,
        isHiredStage: false,
      },
    ])

    const result = await listRecruiterStages()

    expect(result).toEqual([
      {
        id: "hired",
        name: "Hired",
        order: 1,
        orderIndex: 1,
        final: true,
        isHiredStage: true,
      },
      {
        id: "reject",
        name: "No seleccionado",
        order: 2,
        orderIndex: 2,
        final: true,
        isHiredStage: false,
      },
    ])
  })

  it("breaks orderIndex ties by id", async () => {
    apiGet.mockResolvedValueOnce([
      { id: "b", name: "Beta", orderIndex: 1, final: false, isHiredStage: false },
      { id: "a", name: "Alpha", orderIndex: 1, final: false, isHiredStage: false },
    ])

    const result = await listRecruiterStages()

    expect(result.map((s) => s.id)).toEqual(["a", "b"])
  })
})

describe("listCompanyApplicantStatuses", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("calls the global statuses endpoint", async () => {
    apiGet.mockResolvedValueOnce([{ id: "st1", name: "Active" }])

    const result = await listCompanyApplicantStatuses()

    expect(apiGet).toHaveBeenCalledWith("/api/recruiter/statuses")
    expect(result).toEqual([{ id: "st1", name: "Active", final: false }])
  })
})

describe("listCompanyVacancyStatuses", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("calls vacancy-statuses endpoint for the given company", async () => {
    apiGet.mockResolvedValueOnce([{ id: "s1", name: "Abierta" }])

    const result = await listCompanyVacancyStatuses("company-b-id")

    expect(apiGet).toHaveBeenCalledWith(
      "/api/recruiter/companies/company-b-id/vacancy-statuses"
    )
    expect(result).toEqual([{ id: "s1", name: "Abierta" }])
  })

  it("returns empty array when companyId is blank", async () => {
    const result = await listCompanyVacancyStatuses("  ")
    expect(apiGet).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })
})
