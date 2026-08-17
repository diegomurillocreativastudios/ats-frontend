import { describe, expect, it } from "vitest"
import {
  formatRequirementKey,
  toRequirementImportance,
} from "@/lib/vacancies/format-requirement-key"

describe("formatRequirementKey", () => {
  it("turns snake_case keys into sentence-style labels", () => {
    expect(formatRequirementKey("Analisis_de_datos")).toBe("Analisis de datos")
    expect(formatRequirementKey("Toma_de_decisiones_a_alta_velocidad")).toBe(
      "Toma de decisiones a alta velocidad"
    )
    expect(formatRequirementKey("Comunicacion_en_equipo")).toBe("Comunicacion en equipo")
  })

  it("maps known tech keys", () => {
    expect(formatRequirementKey("reactjs")).toBe("React.js")
    expect(formatRequirementKey("attr_nextjs")).toBe("Next.js")
  })

  it("splits camelCase", () => {
    expect(formatRequirementKey("physicalEndurance")).toBe("Physical endurance")
  })

  it("returns an empty string for blank keys", () => {
    expect(formatRequirementKey("")).toBe("")
    expect(formatRequirementKey(null)).toBe("")
  })
})

describe("toRequirementImportance", () => {
  it("converts 0–1 weights to a 1–10 scale", () => {
    expect(toRequirementImportance(0.8)).toBe(8)
    expect(toRequirementImportance(1)).toBe(10)
    expect(toRequirementImportance(0.75)).toBe(8)
  })

  it("keeps values already on a 1–10 scale", () => {
    expect(toRequirementImportance(9)).toBe(9)
  })

  it("returns null for missing weights", () => {
    expect(toRequirementImportance(undefined)).toBeNull()
    expect(toRequirementImportance("8")).toBeNull()
  })
})
