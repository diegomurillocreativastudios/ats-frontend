import { describe, expect, it } from "vitest"
import { splitQualitativeFacts } from "@/lib/vacancies/split-qualitative-facts"

describe("splitQualitativeFacts", () => {
  it("keeps delimited facts from bullets or middots", () => {
    expect(
      splitQualitativeFacts("Programa junior Mercedes · Experiencia F2 · Super License FIA")
    ).toEqual([
      "Programa junior Mercedes",
      "Experiencia F2",
      "Super License FIA",
    ])
  })

  it("splits prose on sentences", () => {
    expect(
      splitQualitativeFacts(
        "No hay debilidades mayores. El CV ya lo posiciona como piloto de F1 para 2025."
      )
    ).toEqual([
      "No hay debilidades mayores.",
      "El CV ya lo posiciona como piloto de F1 para 2025.",
    ])
  })

  it("keeps a single sentence intact", () => {
    expect(
      splitQualitativeFacts(
        "El candidato proviene del Mercedes Junior Program, con paso por F2 y FRECA."
      )
    ).toEqual([
      "El candidato proviene del Mercedes Junior Program, con paso por F2 y FRECA.",
    ])
  })

  it("returns an empty list for blank values", () => {
    expect(splitQualitativeFacts("")).toEqual([])
    expect(splitQualitativeFacts(null)).toEqual([])
  })
})
