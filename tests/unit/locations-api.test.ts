import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  fetchAllLocationCountries,
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

  it("fetchAllLocationCountries loads every page", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        items: [{ iso2: "SV", geonameId: 1, iso3: "SLV", names: { display: "El Salvador" } }],
        page: 1,
        pageSize: 100,
        total: 2,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        items: [{ iso2: "MX", geonameId: 2, iso3: "MEX", names: { display: "México" } }],
        page: 2,
        pageSize: 100,
        total: 2,
        totalPages: 2,
      })

    const countries = await fetchAllLocationCountries()

    expect(countries).toHaveLength(2)
    expect(countries.map((c) => c.iso2)).toEqual(["SV", "MX"])
    expect(apiClient.get).toHaveBeenCalledTimes(2)
    expect(apiClient.get).toHaveBeenNthCalledWith(
      1,
      "/api/locations/countries?page=1&pageSize=100"
    )
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      "/api/locations/countries?page=2&pageSize=100"
    )
  })

  it("searchLocationCountries unwraps a nested data envelope", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [
          {
            iso2: "HN",
            geonameId: 3,
            iso3: "HND",
            names: { display: "Honduras" },
          },
        ],
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    })

    const result = await searchLocationCountries()

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.iso2).toBe("HN")
    expect(result.totalPages).toBe(1)
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
