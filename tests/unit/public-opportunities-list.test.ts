import { describe, expect, it } from "vitest"
import {
  getOpportunityResultsRange,
  mergeCountryFilterOptions,
  vacancyMatchesSearch,
} from "@/lib/public-opportunities-list"

describe("vacancyMatchesSearch", () => {
  const vacancy = {
    title: "Piloto titular de Fórmula 1",
    company: { name: "Mercedes Benz" },
  }

  it("coincide por título", () => {
    expect(vacancyMatchesSearch(vacancy, "fórmula")).toBe(true)
    expect(vacancyMatchesSearch(vacancy, "piloto")).toBe(true)
  })

  it("coincide por empresa", () => {
    expect(vacancyMatchesSearch(vacancy, "mercedes")).toBe(true)
  })

  it("ignora mayúsculas y espacios", () => {
    expect(vacancyMatchesSearch(vacancy, "  MERCEDES  ")).toBe(true)
  })

  it("devuelve todas las vacantes si la búsqueda está vacía", () => {
    expect(vacancyMatchesSearch(vacancy, "   ")).toBe(true)
  })

  it("no coincide si el texto no está en título ni empresa", () => {
    expect(vacancyMatchesSearch(vacancy, "creativa")).toBe(false)
  })
})

describe("getOpportunityResultsRange", () => {
  it("calcula el rango 1-based de la página actual", () => {
    expect(getOpportunityResultsRange(2, 10, 23)).toEqual({
      from: 11,
      to: 20,
      total: 23,
    })
  })

  it("ajusta el final en la última página", () => {
    expect(getOpportunityResultsRange(3, 10, 23)).toEqual({
      from: 21,
      to: 23,
      total: 23,
    })
  })

  it("devuelve ceros si no hay resultados", () => {
    expect(getOpportunityResultsRange(1, 10, 0)).toEqual({
      from: 0,
      to: 0,
      total: 0,
    })
  })
})

describe("mergeCountryFilterOptions", () => {
  it("conserva países ya vistos al filtrar la página actual", () => {
    const merged = mergeCountryFilterOptions(
      [{ code: "DE", label: "Alemania" }],
      [{ countryCode: "SV", countryLabel: "El Salvador" }],
      { code: "SV", label: "El Salvador" }
    )

    expect(merged.map((option) => option.code)).toEqual(["DE", "SV"])
  })

  it("incluye el país seleccionado aunque no venga en los ítems", () => {
    const merged = mergeCountryFilterOptions([], [], {
      code: "it",
      label: "Italia",
    })

    expect(merged).toEqual([{ code: "IT", label: "Italia" }])
  })
})
