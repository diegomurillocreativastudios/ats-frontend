import { describe, expect, it } from "vitest"
import {
  buildApplicantComponentScoreAverages,
  extractApplicantComponentScores01,
  resolveOrderedStageNames,
  type VacancyApplicantLike,
} from "@/lib/rrhh/vacancy-pipeline-stats"

describe("resolveOrderedStageNames", () => {
  it("appends applicant stages that are missing from the kanban catalog", () => {
    const kanban = ["Applied", "Screening"]
    const applicants: VacancyApplicantLike[] = [
      { applicationStage: "Revision", totalScore: 0.5 },
      { applicationStage: "En espera", totalScore: 0.4 },
    ]
    const ordered = resolveOrderedStageNames(kanban, applicants)
    expect(ordered.slice(0, 2)).toEqual(["Applied", "Screening"])
    expect(ordered).toContain("Revision")
    expect(ordered).toContain("En espera")
    expect(ordered.length).toBe(4)
  })

  it("deduplicates kanban stage names case-insensitively", () => {
    const kanban = ["Applied", "applied", "Screening"]
    const ordered = resolveOrderedStageNames(kanban, [])
    expect(ordered).toEqual(["Applied", "Screening"])
  })
})

describe("extractApplicantComponentScores01", () => {
  it("reads PascalCase keys from componentScores", () => {
    const match: VacancyApplicantLike = {
      componentScores: {
        QualitativeScore: 0.2,
        VectorSimilarity: 0.66,
        attribute_aggregate: 0,
      },
    }
    expect(extractApplicantComponentScores01(match)).toEqual({
      qualitative: 0.2,
      vector: 0.66,
      attributeAggregate: 0,
    })
  })
})

describe("buildApplicantComponentScoreAverages", () => {
  it("averages each component only over applicants that provide that number", () => {
    const applicants: VacancyApplicantLike[] = [
      {
        componentScores: {
          QualitativeScore: 0.2,
          VectorSimilarity: 1,
          attribute_aggregate: 0,
        },
      },
      {
        componentScores: {
          QualitativeScore: 0.4,
          VectorSimilarity: 0,
        },
      },
    ]
    const avg = buildApplicantComponentScoreAverages(applicants)
    expect(avg.qualitativeMean01).toBeCloseTo(0.3)
    expect(avg.vectorMean01).toBeCloseTo(0.5)
    expect(avg.attributeMean01).toBe(0)
    expect(avg.samplesWithAnyComponent).toBe(2)
  })
})
