import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  filterPhoneCountries,
  loadPhoneCountries,
  resetPhoneCountriesCache,
  type PhoneCountryOption,
} from "@/lib/phone-countries"

const getCountriesMock = vi.hoisted(() => vi.fn())

vi.mock("@countrystatecity/countries-browser", () => ({
  getCountries: getCountriesMock,
}))

const sample: PhoneCountryOption[] = [
  { iso2: "MX", name: "Mexico", phonecode: "+52" },
  { iso2: "SV", name: "El Salvador", phonecode: "+503" },
  { iso2: "US", name: "United States", phonecode: "+1" },
]

describe("filterPhoneCountries", () => {
  it("devuelve la lista completa si la búsqueda está vacía", () => {
    expect(filterPhoneCountries(sample, "  ")).toEqual(sample)
  })

  it("filtra por nombre, ISO-2 y prefijo", () => {
    expect(filterPhoneCountries(sample, "salva").map((c) => c.iso2)).toEqual([
      "SV",
    ])
    expect(filterPhoneCountries(sample, "mx").map((c) => c.iso2)).toEqual(["MX"])
    expect(filterPhoneCountries(sample, "503").map((c) => c.iso2)).toEqual([
      "SV",
    ])
    expect(filterPhoneCountries(sample, "+52").map((c) => c.iso2)).toEqual([
      "MX",
    ])
  })
})

describe("loadPhoneCountries", () => {
  beforeEach(() => {
    resetPhoneCountriesCache()
    getCountriesMock.mockReset()
    getCountriesMock.mockResolvedValue([
      { iso2: "sv", name: "El Salvador", phonecode: "503" },
      { iso2: "us", name: "United States", phonecode: "1" },
    ])
  })

  it("normaliza, ordena y reutiliza el cache", async () => {
    const first = await loadPhoneCountries()
    const second = await loadPhoneCountries()

    expect(first).toBe(second)
    expect(first).toEqual([
      { iso2: "SV", name: "El Salvador", phonecode: "+503" },
      { iso2: "US", name: "United States", phonecode: "+1" },
    ])
    expect(getCountriesMock).toHaveBeenCalledTimes(1)
  })
})
