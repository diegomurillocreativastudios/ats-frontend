import { describe, expect, it, vi } from "vitest"
import { screen, within } from "@testing-library/react"

import { renderWithIntl } from "../helpers/render-with-intl"
import { VacancyLocationFields } from "@/components/rrhh/VacancyLocationFields"

vi.mock("@/lib/api/locations", () => ({
  getLocationCatalogStatus: vi.fn(async () => {
    throw new Error("offline")
  }),
  fetchAllLocationCountries: vi.fn(async () => []),
  fetchAllLocationDivisions: vi.fn(async () => []),
}))

describe("VacancyLocationFields bundled catalog fallback", () => {
  it("fills the country select from the packaged catalog when GeoNames is down", async () => {
    renderWithIntl(
      <VacancyLocationFields countryCode="" stateCode="" onChange={() => {}} />,
      { locale: "es" }
    )

    const countrySelect = await screen.findByLabelText("País")
    expect(countrySelect).not.toBeDisabled()
    expect(
      within(countrySelect).getByRole("option", { name: "El Salvador" })
    ).toBeInTheDocument()
    expect(
      screen.queryByText("No se pudieron cargar los países.")
    ).not.toBeInTheDocument()
  })
})
