import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  clearVacancyLocationDisplayCache,
  formatVacancyCountryLabel,
  formatVacancyStateLabel,
  resolveVacancyStateDisplayName,
} from "@/lib/vacancies/vacancy-location-display"

vi.mock("@/lib/api/locations", () => ({
  getLocationCatalogStatus: vi.fn(),
  searchLocationDivisions: vi.fn(),
}))

vi.mock("@countrystatecity/countries-browser", () => ({
  getStateByCode: vi.fn(async (countryCode: string, stateCode: string) => {
    if (countryCode === "SV" && stateCode === "SS") {
      return {
        iso2: "SS",
        name: "San Salvador",
        native: "San Salvador",
        translations: {},
      }
    }
    if (countryCode === "AR" && stateCode === "C") {
      return {
        iso2: "C",
        name: "Autonomous City of Buenos Aires",
        native: "Ciudad autónoma de Buenos Aires",
        translations: {},
      }
    }
    if (countryCode === "US" && stateCode === "NY") {
      return {
        iso2: "NY",
        name: "New York",
        native: "New York",
        translations: {},
      }
    }
    return null
  }),
}))

import { getLocationCatalogStatus, searchLocationDivisions } from "@/lib/api/locations"

describe("vacancy-location-display", () => {
  beforeEach(() => {
    clearVacancyLocationDisplayCache()
    vi.mocked(getLocationCatalogStatus).mockReset()
    vi.mocked(searchLocationDivisions).mockReset()
    vi.mocked(getLocationCatalogStatus).mockResolvedValue({ hasData: false })
  })

  it("formats country labels in Spanish via Intl", () => {
    expect(formatVacancyCountryLabel("US")).toBe("Estados Unidos")
    expect(formatVacancyCountryLabel("SV")).toBe("El Salvador")
  })

  it("prefers native Spanish state names when the API name is English", () => {
    expect(
      formatVacancyStateLabel(
        {
          iso2: "C",
          name: "Autonomous City of Buenos Aires",
          native: "Ciudad autónoma de Buenos Aires",
          translations: {},
        },
        "AR"
      )
    ).toBe("Ciudad Autónoma de Buenos Aires")
  })

  it("maps selected US states to Spanish display names", () => {
    expect(
      formatVacancyStateLabel(
        {
          iso2: "NY",
          name: "New York",
          native: "New York",
          translations: {},
        },
        "US"
      )
    ).toBe("Nueva York")
  })

  it("resolves async state display names in Spanish", async () => {
    await expect(resolveVacancyStateDisplayName("SV", "SS")).resolves.toBe("San Salvador")
    await expect(resolveVacancyStateDisplayName("US", "NY")).resolves.toBe("Nueva York")
  })

  it("resolves GeoNames shortCode divisions when countries-browser has no match", async () => {
    vi.mocked(getLocationCatalogStatus).mockResolvedValue({ hasData: true })
    vi.mocked(searchLocationDivisions).mockResolvedValue({
      items: [
        {
          geonameId: 1,
          countryIso2: "HN",
          adminLevel: 1,
          adminCode: "HN.08",
          shortCode: "08",
          parentGeonameId: null,
          names: {
            original: "Francisco Morazan",
            ascii: "Francisco Morazan",
            es: "Francisco Morazán",
            display: "Francisco Morazán",
          },
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1,
    })

    await expect(resolveVacancyStateDisplayName("HN", "08")).resolves.toBe(
      "Francisco Morazán"
    )
  })

  it("fetches GeoNames divisions once per country when resolving multiple states", async () => {
    vi.mocked(getLocationCatalogStatus).mockResolvedValue({ hasData: true })
    vi.mocked(searchLocationDivisions).mockResolvedValue({
      items: [
        {
          geonameId: 1,
          countryIso2: "HN",
          adminLevel: 1,
          adminCode: "HN.08",
          shortCode: "08",
          parentGeonameId: null,
          names: {
            original: "Francisco Morazan",
            ascii: "Francisco Morazan",
            es: "Francisco Morazán",
            display: "Francisco Morazán",
          },
        },
        {
          geonameId: 2,
          countryIso2: "HN",
          adminLevel: 1,
          adminCode: "HN.05",
          shortCode: "05",
          parentGeonameId: null,
          names: {
            original: "Cortes",
            ascii: "Cortes",
            es: "Cortés",
            display: "Cortés",
          },
        },
      ],
      page: 1,
      pageSize: 100,
      total: 2,
      totalPages: 1,
    })

    await Promise.all([
      resolveVacancyStateDisplayName("HN", "08"),
      resolveVacancyStateDisplayName("HN", "05"),
    ])

    expect(searchLocationDivisions).toHaveBeenCalledTimes(1)
    expect(getLocationCatalogStatus).toHaveBeenCalledTimes(1)
  })
})
