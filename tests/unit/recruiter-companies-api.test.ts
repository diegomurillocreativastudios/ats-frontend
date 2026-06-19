import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  DEFAULT_RECRUITER_COMPANY_ID,
  listRecruiterCompanies,
  listCompanyVacancyStatuses,
  resolveVacancyCompanyId,
  persistVacancyCompanyId,
  readPersistedVacancyCompanyId,
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
    { id: "00000000-0000-0000-0000-000000000001", name: "Appli AI" },
    { id: "company-b-id", name: "Acme Corp" },
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
          company: "Appli AI",
        },
        companies,
        "vac-99"
      )
    ).toBe("00000000-0000-0000-0000-000000000001")
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
      { id: "a", name: "Alpha" },
      { id: "b", name: "Default Company" },
    ])
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
