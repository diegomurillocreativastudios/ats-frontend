import { describe, expect, it } from "vitest"
import {
  buildAttributeTableRows,
  canonicalAttributeKey,
} from "@/lib/vacancies/build-attribute-table-rows"

describe("canonicalAttributeKey", () => {
  it("merges attr_ prefixes with snake_case keys", () => {
    expect(canonicalAttributeKey("attr_resistencia_fisica")).toBe(
      canonicalAttributeKey("Resistencia_fisica")
    )
    expect(canonicalAttributeKey("Analisis_de_datos")).toBe(
      canonicalAttributeKey("analisis_de_datos")
    )
  })
})

describe("buildAttributeTableRows", () => {
  it("does not duplicate matched attributes that already have a score row", () => {
    const rows = buildAttributeTableRows(
      [
        ["Analisis_de_datos", 1],
        ["Resistencia_fisica", 1],
      ],
      [
        ["Analisis_de_datos", "Avanzado"],
        ["Resistencia_fisica", "Avanzado"],
        ["attr_tecnica_de_carrera", "Avanzado"],
      ],
      (key) => String(key)
    )

    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.label)).toEqual([
      "Analisis_de_datos",
      "Resistencia_fisica",
      "Tecnica de carrera",
    ])
    expect(rows[0].level).toBe("Avanzado")
    expect(rows[2].score).toBeNull()
  })
})
