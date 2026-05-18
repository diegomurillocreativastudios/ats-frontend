import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  getLocationCatalogStatus,
  searchLocationCountries,
  searchLocationDivisions,
} from "@/lib/api/locations"
import { apiClient } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe("locations API client", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
  })

  it("getLocationCatalogStatus calls status endpoint", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ hasData: true })

    const status = await getLocationCatalogStatus()

    expect(apiClient.get).toHaveBeenCalledWith("/api/locations/status")
    expect(status.hasData).toBe(true)
  })

  it("searchLocationCountries builds query string", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0,
    })

    await searchLocationCountries({ search: "méx", page: 2, pageSize: 25 })

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/locations/countries?search=m%C3%A9x&page=2&pageSize=25"
    )
  })

  it("searchLocationDivisions targets divisions route", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0,
    })

    await searchLocationDivisions({
      countryIso2: "SV",
      level: 1,
      parentGeonameId: 123,
    })

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/locations/countries/SV/divisions?level=1&parentGeonameId=123&page=1&pageSize=50"
    )
  })
})
