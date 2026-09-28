import { useState } from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"

import { renderWithIntl } from "../helpers/render-with-intl"
import { VacancyLocationFields } from "@/components/rrhh/VacancyLocationFields"

const locationMocks = vi.hoisted(() => ({
  getLocationCatalogStatus: vi.fn(),
  fetchAllLocationCountries: vi.fn(),
  fetchAllLocationDivisions: vi.fn(),
}))

const bundledMocks = vi.hoisted(() => ({
  getBundledCountryOptions: vi.fn(() => [{ iso2: "SV", label: "El Salvador" }]),
  getBundledStatesOfCountry: vi.fn(async () => [
    {
      iso2: "SS",
      name: "San Salvador",
      native: "San Salvador",
      translations: {},
    },
  ]),
}))

vi.mock("@/lib/api/locations", () => ({
  getLocationCatalogStatus: locationMocks.getLocationCatalogStatus,
  fetchAllLocationCountries: locationMocks.fetchAllLocationCountries,
  fetchAllLocationDivisions: locationMocks.fetchAllLocationDivisions,
}))

vi.mock("@/lib/locations/bundled-catalog", () => ({
  getBundledCountryOptions: bundledMocks.getBundledCountryOptions,
  getBundledStatesOfCountry: bundledMocks.getBundledStatesOfCountry,
}))

function LocationHarness() {
  const [countryCode, setCountryCode] = useState("")
  const [stateCode, setStateCode] = useState("")
  return (
    <VacancyLocationFields
      countryCode={countryCode}
      stateCode={stateCode}
      onChange={({ countryCode: nextCountry, stateCode: nextState }) => {
        setCountryCode(nextCountry)
        setStateCode(nextState)
      }}
    />
  )
}

async function chooseElSalvador() {
  const countrySelect = await screen.findByLabelText("País")
  expect(
    await within(countrySelect).findByRole("option", { name: "El Salvador" })
  ).toBeInTheDocument()
  fireEvent.change(countrySelect, { target: { value: "SV" } })
  return screen.findByLabelText("Estado / provincia")
}

describe("VacancyLocationFields state catalog", () => {
  beforeEach(() => {
    locationMocks.getLocationCatalogStatus.mockReset()
    locationMocks.fetchAllLocationCountries.mockReset()
    locationMocks.fetchAllLocationDivisions.mockReset()
    bundledMocks.getBundledStatesOfCountry.mockClear()
    locationMocks.getLocationCatalogStatus.mockResolvedValue({ hasData: true })
    locationMocks.fetchAllLocationCountries.mockResolvedValue([
      {
        geonameId: 1,
        iso2: "SV",
        iso3: "SLV",
        names: { original: "El Salvador", ascii: "El Salvador", es: "El Salvador", display: "El Salvador" },
      },
    ])
  })

  it("fills states from GeoNames after choosing a country", async () => {
    locationMocks.fetchAllLocationDivisions.mockResolvedValue([
      {
        geonameId: 1,
        countryIso2: "SV",
        adminLevel: 1,
        adminCode: "SV.10",
        shortCode: "10",
        parentGeonameId: null,
        names: {
          original: "San Salvador",
          ascii: "San Salvador",
          es: "San Salvador",
          display: "San Salvador",
        },
      },
    ])

    renderWithIntl(<LocationHarness />, { locale: "es" })

    const stateSelect = await chooseElSalvador()
    expect(
      await within(stateSelect).findByRole("option", { name: "San Salvador" })
    ).toBeInTheDocument()
    expect(locationMocks.fetchAllLocationDivisions).toHaveBeenCalled()
  })

  it("falls back to the packaged catalog when GeoNames divisions are empty", async () => {
    locationMocks.fetchAllLocationDivisions.mockResolvedValue([])

    renderWithIntl(<LocationHarness />, { locale: "es" })

    const stateSelect = await chooseElSalvador()
    expect(
      await within(stateSelect).findByRole("option", { name: "San Salvador" })
    ).toBeInTheDocument()
    expect(bundledMocks.getBundledStatesOfCountry).toHaveBeenCalledWith("SV")
  })

  it("falls back to the packaged catalog when GeoNames divisions fail", async () => {
    locationMocks.fetchAllLocationDivisions.mockRejectedValue(new Error("offline"))

    renderWithIntl(<LocationHarness />, { locale: "es" })

    const stateSelect = await chooseElSalvador()
    expect(
      await within(stateSelect).findByRole("option", { name: "San Salvador" })
    ).toBeInTheDocument()
  })
})
