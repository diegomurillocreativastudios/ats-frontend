import { describe, expect, it } from "vitest"
import {
  buildApplicantComponentScoreAverages,
  buildPersonIdentityKeySet,
  collectPersonIdentityKeys,
  extractApplicantComponentScores01,
  filterCandidatesNotInProcess,
  getApplicantPrimaryScore01,
  getCandidateId,
  getKanbanRowId,
  isPersonInIdentitySet,
  parseFallbackKanbanStages,
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

  it("uses applicant stage names when the company catalog is empty", () => {
    const applicants: VacancyApplicantLike[] = [
      { applicationStage: "Postulados", totalScore: 0.5 },
      { applicationStage: "Entrevista", totalScore: 0.4 },
    ]
    const ordered = resolveOrderedStageNames([], applicants)
    expect(ordered).toEqual(["Postulados", "Entrevista"])
  })

  it("uses localized fallback names only when catalog and applicants are empty", () => {
    const ordered = resolveOrderedStageNames([], [], [
      "Postulados",
      "Filtrado",
      "Entrevista",
    ])
    expect(ordered).toEqual(["Postulados", "Filtrado", "Entrevista"])
  })
})

describe("parseFallbackKanbanStages", () => {
  it("reads a non-empty string array from i18n", () => {
    expect(parseFallbackKanbanStages(["Postulados", "Filtrado"])).toEqual([
      "Postulados",
      "Filtrado",
    ])
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

describe("getApplicantPrimaryScore01", () => {
  it("prefers totalScore over semanticScore", () => {
    expect(
      getApplicantPrimaryScore01({
        semanticScore: 0.71,
        totalScore: 0.82,
      })
    ).toBe(0.82)
  })

  it("uses matchScore when totalScore is missing", () => {
    expect(
      getApplicantPrimaryScore01({
        semanticScore: 0.71,
        matchScore: 0.82,
      })
    ).toBe(0.82)
  })

  it("falls back to semanticScore only for legacy payloads", () => {
    expect(getApplicantPrimaryScore01({ semanticScore: 0.68 })).toBe(0.68)
  })
})

describe("filterCandidatesNotInProcess", () => {
  it("excludes suggestions that share candidateProfileId with an applicant", () => {
    const suggestions: VacancyApplicantLike[] = [
      { candidateProfileId: "profile-jessica", name: "Jessica", totalScore: 0.82 },
      { candidateProfileId: "profile-other", name: "Other", totalScore: 0.7 },
    ]
    const applicants: VacancyApplicantLike[] = [
      { candidateProfileId: "profile-jessica", applicationId: "app-1", totalScore: 0.82 },
    ]
    const filtered = filterCandidatesNotInProcess(suggestions, applicants)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.candidateProfileId).toBe("profile-other")
  })

  it("excludes when suggestion has profile+document and applicant only has profile", () => {
    const suggestions: VacancyApplicantLike[] = [
      {
        candidateProfileId: "profile-1",
        candidateDocumentId: "doc-1",
        name: "Jessica",
      },
      { candidateProfileId: "profile-2", candidateDocumentId: "doc-2", name: "Keep" },
    ]
    const applicants: VacancyApplicantLike[] = [
      { candidateProfileId: "profile-1", applicationId: "app-1" },
    ]
    const filtered = filterCandidatesNotInProcess(suggestions, applicants)
    expect(filtered.map((m) => m.candidateProfileId)).toEqual(["profile-2"])
  })

  it("excludes when suggestion has only document and applicant has same document", () => {
    const suggestions: VacancyApplicantLike[] = [
      { candidateDocumentId: "doc-shared", name: "Dup" },
      { candidateDocumentId: "doc-new", name: "New" },
    ]
    const applicants: VacancyApplicantLike[] = [
      { candidateDocumentId: "doc-shared", applicationId: "app-1" },
    ]
    expect(filterCandidatesNotInProcess(suggestions, applicants)).toEqual([
      { candidateDocumentId: "doc-new", name: "New" },
    ])
  })

  it("keeps unrelated suggestions when applicants are empty", () => {
    const suggestions: VacancyApplicantLike[] = [
      { candidateProfileId: "p1", name: "A" },
    ]
    expect(filterCandidatesNotInProcess(suggestions, [])).toEqual(suggestions)
  })

  it("matches snake_case identity fields", () => {
    const keys = collectPersonIdentityKeys({
      candidate_profile_id: "p-snake",
      candidate_document_id: "d-snake",
    })
    expect(keys).toEqual(["p-snake", "d-snake"])
    const set = buildPersonIdentityKeySet([{ candidateProfileId: "p-snake" }])
    expect(isPersonInIdentitySet({ candidate_document_id: "d-other", candidate_profile_id: "p-snake" }, set)).toBe(
      true
    )
  })
})

describe("getKanbanRowId", () => {
  it("uses distinct applicationIds when the same profile has multiple applications", () => {
    const a: VacancyApplicantLike = {
      candidateProfileId: "profile-1",
      candidateDocumentId: "doc-1",
      applicationId: "app-a",
    }
    const b: VacancyApplicantLike = {
      candidateProfileId: "profile-1",
      candidateDocumentId: "doc-1",
      applicationId: "app-b",
    }
    expect(getCandidateId(a, 0)).toBe(getCandidateId(b, 1))
    expect(getKanbanRowId(a, 0)).toBe("app-a")
    expect(getKanbanRowId(b, 1)).toBe("app-b")
    expect(getKanbanRowId(a, 0)).not.toBe(getKanbanRowId(b, 1))
  })

  it("reads application_id snake_case", () => {
    expect(
      getKanbanRowId({ application_id: "app-snake", candidateProfileId: "p1" }, 0)
    ).toBe("app-snake")
  })

  it("falls back to profile id plus index when applicationId is missing", () => {
    const a: VacancyApplicantLike = { candidateProfileId: "profile-1" }
    const b: VacancyApplicantLike = { candidateProfileId: "profile-1" }
    expect(getKanbanRowId(a, 0)).toBe("profile-1::row-0")
    expect(getKanbanRowId(b, 1)).toBe("profile-1::row-1")
    expect(getKanbanRowId(a, 0)).not.toBe(getKanbanRowId(b, 1))
  })
})
