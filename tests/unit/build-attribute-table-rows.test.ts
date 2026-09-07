import { describe, expect, it } from "vitest"
import {
  buildAttributeTableRows,
  canonicalAttributeKey,
  MATCHED_ATTRIBUTE_RECORD_KEYS,
  pickNamedRecord,
  toAttributeLevel,
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

  it("hides boolean presence flags instead of showing true or false", () => {
    const rows = buildAttributeTableRows(
      [
        ["Git", 1],
        ["HTML", 1],
        ["CSS", 1],
        ["Next.js", 0],
      ],
      [
        ["Git", true],
        ["HTML", "true"],
        ["CSS", "layout responsivo y estados de UI"],
        ["React", false],
      ],
      (key) => String(key)
    )

    expect(rows.find((row) => row.key === "Git")?.level).toBeNull()
    expect(rows.find((row) => row.key === "HTML")?.level).toBeNull()
    expect(rows.find((row) => row.key === "CSS")?.level).toBe(
      "layout responsivo y estados de UI"
    )
    expect(rows.find((row) => row.key === "React")?.level).toBeNull()
    expect(rows.find((row) => row.key === "Next.js")?.level).toBeNull()
  })

  it("reads evidence from nested match objects and ignores presence-only flags", () => {
    const rows = buildAttributeTableRows(
      [
        ["Git", 1],
        ["CSS", 1],
        ["TypeScript", 1],
      ],
      [
        ["Git", { matched: true }],
        ["CSS", { matched: true, evidence: "layout responsivo y estados de UI" }],
        ["TypeScript", { Level: "True" }],
      ],
      (key) => String(key)
    )

    expect(rows.find((row) => row.key === "Git")?.level).toBeNull()
    expect(rows.find((row) => row.key === "CSS")?.level).toBe(
      "layout responsivo y estados de UI"
    )
    expect(rows.find((row) => row.key === "TypeScript")?.level).toBeNull()
  })
})

describe("toAttributeLevel", () => {
  it("rejects boolean-like values from the matching payload", () => {
    expect(toAttributeLevel(true)).toBeNull()
    expect(toAttributeLevel(false)).toBeNull()
    expect(toAttributeLevel("True")).toBeNull()
    expect(toAttributeLevel(" FALSE ")).toBeNull()
    expect(toAttributeLevel({ matched: true, value: true })).toBeNull()
    expect(toAttributeLevel("2+ años en producción")).toBe("2+ años en producción")
  })
})

describe("pickNamedRecord", () => {
  it("reads PascalCase matched attributes from a .NET payload", () => {
    const record = pickNamedRecord(
      {
        MatchedAttributes: { Git: true, CSS: "layout responsivo" },
      },
      MATCHED_ATTRIBUTE_RECORD_KEYS
    )

    expect(record).toEqual({ Git: true, CSS: "layout responsivo" })
  })
})
