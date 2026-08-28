import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  mapVacancyCompanyPatchError,
  patchVacancyClientCompany,
  listRecruiterVacanciesPage,
} from "@/lib/api/recruiter-vacancies"

const apiPatch = vi.fn()
const apiGetWithHeaders = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    patch: (...args: unknown[]) => apiPatch(...args),
    getWithHeaders: (...args: unknown[]) => apiGetWithHeaders(...args),
  },
}))

describe("mapVacancyCompanyPatchError", () => {
  it("maps company not found", () => {
    expect(mapVacancyCompanyPatchError({ message: "Company not found." })).toBe(
      "La empresa cliente seleccionada no existe o fue eliminada."
    )
  })

  it("maps company not active", () => {
    expect(mapVacancyCompanyPatchError({ detail: "Company is not active." })).toBe(
      "La empresa cliente seleccionada está inactiva. Elige otra del listado."
    )
  })
})

describe("patchVacancyClientCompany", () => {
  beforeEach(() => {
    apiPatch.mockReset()
  })

  it("calls PATCH with companyId only", async () => {
    apiPatch.mockResolvedValueOnce({ id: "vac-1", companyId: "co-2" })

    await patchVacancyClientCompany("vac-1", "co-2")

    expect(apiPatch).toHaveBeenCalledWith("/api/recruiter/vacancies/vac-1", {
      companyId: "co-2",
    })
  })

  it("throws when ids are missing", async () => {
    await expect(patchVacancyClientCompany("", "co-2")).rejects.toThrow(
      "Faltan el id de la vacante o la empresa cliente."
    )
  })
})

describe("listRecruiterVacanciesPage", () => {
  beforeEach(() => {
    apiGetWithHeaders.mockReset()
  })

  it("sends page and pageSize and reads X-Total-Count", async () => {
    apiGetWithHeaders.mockResolvedValueOnce({
      data: [{ id: "v1", title: "Dev" }],
      headers: new Headers({
        "X-Total-Count": "14",
        "X-Page": "2",
        "X-Page-Size": "50",
      }),
    })

    const result = await listRecruiterVacanciesPage({ page: 2, pageSize: 50 })

    expect(apiGetWithHeaders).toHaveBeenCalledWith(
      "/api/recruiter/vacancies?page=2&pageSize=50"
    )
    expect(result.items).toHaveLength(1)
    expect(result.totalCount).toBe(14)
    expect(result.page).toBe(2)
  })
})
