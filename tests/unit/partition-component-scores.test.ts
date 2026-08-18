import { describe, expect, it } from "vitest"
import {
  formatScoreKey,
  hasZeroScoreOutsideFullAggregate,
  partitionComponentScores,
  sortScoresByAscendingValue,
} from "@/lib/vacancies/partition-component-scores"

describe("partitionComponentScores", () => {
  it("separates reserved scores from attribute rows", () => {
    const partitioned = partitionComponentScores([
      ["Analisis_de_datos", 1],
      ["attribute_aggregate", 1],
      ["qualitativeScore", 0.99],
      ["vectorSimilarity", 0.777],
      ["Recency", 0],
    ])

    expect(partitioned.attributeIndividuals.map(([key]) => key)).toEqual([
      "Analisis_de_datos",
      "Recency",
    ])
    expect(partitioned.aggregateEntry?.[1]).toBe(1)
    expect(partitioned.qualitativeEntry?.[1]).toBe(0.99)
    expect(partitioned.semanticEntry?.[1]).toBe(0.777)
  })
})

describe("sortScoresByAscendingValue", () => {
  it("puts gaps first", () => {
    const sorted = sortScoresByAscendingValue([
      ["Analisis_de_datos", 1],
      ["Recency", 0],
      ["Relevant years", 0],
    ])
    expect(sorted.map(([key]) => key)).toEqual([
      "Recency",
      "Relevant years",
      "Analisis_de_datos",
    ])
  })
})

describe("hasZeroScoreOutsideFullAggregate", () => {
  it("detects a full aggregate with zeroed rows", () => {
    expect(
      hasZeroScoreOutsideFullAggregate(
        [
          ["Analisis_de_datos", 1],
          ["Recency", 0],
        ],
        ["attribute_aggregate", 1]
      )
    ).toBe(true)
  })

  it("is false when the aggregate is not full", () => {
    expect(
      hasZeroScoreOutsideFullAggregate([["Recency", 0]], ["attribute_aggregate", 0.8])
    ).toBe(false)
  })
})

describe("formatScoreKey", () => {
  it("uses known labels before humanizing the key", () => {
    expect(formatScoreKey("attribute_aggregate", { attribute_aggregate: "Atributos en conjunto" })).toBe(
      "Atributos en conjunto"
    )
    expect(formatScoreKey("Analisis_de_datos")).toBe("Analisis de datos")
  })
})
