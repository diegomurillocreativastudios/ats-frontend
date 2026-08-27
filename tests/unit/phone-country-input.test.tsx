import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"

import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput"
import { resetPhoneCountriesCache } from "@/lib/phone-countries"

const getCountriesMock = vi.hoisted(() =>
  vi.fn(async () => [
    { iso2: "SV", name: "El Salvador", phonecode: "503" },
    { iso2: "US", name: "United States", phonecode: "1" },
    { iso2: "MX", name: "Mexico", phonecode: "52" },
  ])
)

vi.mock("@countrystatecity/countries-browser", () => ({
  getCountries: getCountriesMock,
}))

function renderPhone(
  props?: Partial<ComponentProps<typeof PhoneCountryInput>>
) {
  const onPhoneChange = vi.fn()
  const onCountryChange = vi.fn()
  render(
    <PhoneCountryInput
      phone="1234"
      countryIso2="SV"
      onPhoneChange={onPhoneChange}
      onCountryChange={onCountryChange}
      countryAriaLabel="Código de país"
      loadingLabel="Cargando países…"
      searchPlaceholder="Buscar país, ISO o código"
      emptyResultsLabel="No se encontraron países"
      {...props}
    />
  )
  return { onPhoneChange, onCountryChange }
}

describe("PhoneCountryInput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPhoneCountriesCache()
  })

  it("no monta las opciones hasta abrir el selector", async () => {
    renderPhone()

    expect(
      await screen.findByRole("button", { name: /Código de país: El Salvador/ })
    ).toBeInTheDocument()
    expect(screen.queryByRole("option")).not.toBeInTheDocument()
  })

  it("filtra países al escribir y notifica el ISO-2 al elegir", async () => {
    const { onCountryChange } = renderPhone()

    fireEvent.click(
      await screen.findByRole("button", { name: /Código de país: El Salvador/ })
    )

    expect(await screen.findByRole("option", { name: /Mexico/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /United States/ })).toBeInTheDocument()

    fireEvent.change(screen.getByRole("combobox", { name: "Buscar país, ISO o código" }), {
      target: { value: "mex" },
    })

    expect(screen.getByRole("option", { name: /Mexico/ })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /United States/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("option", { name: /Mexico/ }))

    expect(onCountryChange).toHaveBeenCalledWith("MX")
    expect(screen.queryByRole("option")).not.toBeInTheDocument()
  })

  it("reutiliza la carga de países entre montajes", async () => {
    const { unmount } = render(
      <PhoneCountryInput
        phone=""
        countryIso2="SV"
        onPhoneChange={vi.fn()}
        onCountryChange={vi.fn()}
        countryAriaLabel="Código de país"
        loadingLabel="Cargando países…"
        searchPlaceholder="Buscar país, ISO o código"
        emptyResultsLabel="No se encontraron países"
      />
    )

    await screen.findByRole("button", { name: /El Salvador/ })
    unmount()

    renderPhone()
    await screen.findByRole("button", { name: /El Salvador/ })

    expect(getCountriesMock).toHaveBeenCalledTimes(1)
  })
})
