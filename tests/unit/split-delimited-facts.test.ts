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

  it("joins a hard wrap that continues in lowercase", () => {
    expect(
      splitDelimitedFacts(
        "Alguien orientado exclusivamente a colocar crédito sin preocupación por la capacidad de pago o la calidad\nde cartera."
      )
    ).toEqual([
      "Alguien orientado exclusivamente a colocar crédito sin preocupación por la capacidad de pago o la calidad de cartera.",
    ])
  })

  it("joins a wrap after a comma", () => {
    expect(
      splitDelimitedFacts(
        "Experiencia mínima sugerida 2 años comprobables, idealmente entre 2 y 3 años, en colocación de créditos,\nmicrofinanzas, MIPYME o productos financieros relacionados."
      )
    ).toEqual([
      "Experiencia mínima sugerida 2 años comprobables, idealmente entre 2 y 3 años, en colocación de créditos, microfinanzas, MIPYME o productos financieros relacionados.",
    ])
  })

  it("keeps semicolon list items that start with a capital letter", () => {
    expect(
      splitDelimitedFacts(
        "Un analista financiero puramente de escritorio sin capacidad comercial;\nUn cobrador cuya experiencia principal sea recuperación;"
      )
    ).toEqual([
      "Un analista financiero puramente de escritorio sin capacidad comercial;",
      "Un cobrador cuya experiencia principal sea recuperación;",
    ])
  })
})
