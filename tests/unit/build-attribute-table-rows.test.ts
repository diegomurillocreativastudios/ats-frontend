import { describe, expect, it } from "vitest"
import {
  buildAttributeRowsFromAssessments,
  buildAttributeTableRows,
  canonicalAttributeKey,
  MATCHED_ATTRIBUTE_RECORD_KEYS,
  pickNamedRecord,
  pickRequirementAssessments,
  toAttributeLevel,
} from "@/lib/vacancies/build-attribute-table-rows"

describe("pickRequirementAssessments", () => {
  it("reads camelCase and PascalCase arrays and drops malformed items", () => {
    expect(
      pickRequirementAssessments({
        requirementAssessments: [
          { key: "ingles", verdict: "Met", score: 1, evidence: "Inglés B2" },
          { verdict: "Met" },
          "nope",
        ],
      })
    ).toEqual([
      { key: "ingles", verdict: "Met", score: 1, evidence: "Inglés B2", candidateValue: null },
    ])
    expect(
      pickRequirementAssessments({
        RequirementAssessments: [{ Key: "sql", Verdict: "NotMet", Score: 0 }],
      })
    ).toEqual([{ key: "sql", verdict: "NotMet", score: 0, evidence: null, candidateValue: null }])
    expect(pickRequirementAssessments({ componentScores: {} })).toEqual([])
  })
})

describe("buildAttributeRowsFromAssessments", () => {
  it("builds one row per requirement with verdict and evidence, unavailable without a score", () => {
    const rows = buildAttributeRowsFromAssessments(
      [
        { key: "ingles", verdict: "Met", score: 1, evidence: "Inglés intermedio-alto (B2)", candidateValue: null },
        { key: "power_bi", verdict: "Unavailable", score: null, evidence: null, candidateValue: null },
        { key: "sql", verdict: "Partial", score: 0.5, evidence: null, candidateValue: "básico" },
      ],
      (key) => key.toUpperCase()
    )

    expect(rows).toEqual([
      { key: "ingles", label: "INGLES", level: "Inglés intermedio-alto (B2)", score: 1, verdict: "Met" },
      { key: "power_bi", label: "POWER_BI", level: null, score: null, verdict: "Unavailable" },
      { key: "sql", label: "SQL", level: "básico", score: 0.5, verdict: "Partial" },
    ])
  })
})

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
