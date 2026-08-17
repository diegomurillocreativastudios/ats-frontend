import { describe, expect, it } from "vitest"
import { splitDelimitedFacts } from "@/lib/vacancies/split-delimited-facts"

describe("splitDelimitedFacts", () => {
  it("splits middot-separated facts", () => {
    expect(
      splitDelimitedFacts(
        "Tiempo completo · Piloto titular F1 · Presencial · Brackley, Reino Unido"
      )
    ).toEqual([
      "Tiempo completo",
      "Piloto titular F1",
      "Presencial",
      "Brackley, Reino Unido",
    ])
  })

  it("keeps hyphenated names together", () => {
    expect(splitDelimitedFacts("Simulador Mercedes-AMG · Ingeniería de élite")).toEqual([
      "Simulador Mercedes-AMG",
      "Ingeniería de élite",
    ])
  })

  it("returns a single item when there are no delimiters", () => {
    expect(splitDelimitedFacts("Tiempo completo")).toEqual(["Tiempo completo"])
  })

  it("returns an empty list for blank values", () => {
    expect(splitDelimitedFacts("")).toEqual([])
    expect(splitDelimitedFacts(null)).toEqual([])
  })
})
