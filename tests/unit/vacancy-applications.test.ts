import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  findApplicationIdForCandidate,
  mergeApplicationWithRichMatch,
  overlayVacancyApplicants,
} from "@/lib/api/vacancy-applications"
import { apiClient } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  apiClient: {
    getWithHeaders: vi.fn(),
  },
}))

describe("overlayVacancyApplicants", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getWithHeaders).mockReset()
  })

  it("merges applications over rich GetVacancy match rows (keeps IA analysis)", async () => {
    vi.mocked(apiClient.getWithHeaders).mockResolvedValueOnce({
      data: [
        {
          applicationId: "app-1",
          candidateProfileId: "p1",
          name: "Ana",
          matchScore: 0.86,
          applicationStage: "Aplicantes",
        },
      ],
      headers: new Headers({
        "X-Total-Count": "1",
        "X-Page": "1",
        "X-Page-Size": "100",
      }),
    })

    const merged = await overlayVacancyApplicants("vac-1", {
      id: "vac-1",
      title: "Dev",
      applicants: [],
      aiMatchSuggestions: [
        {
          applicationId: "app-1",
          candidateProfileId: "p1",
          name: "Ana",
          totalScore: 0.86,
          qualitativeReasoning: "Buen fit .NET",
          componentScores: { Skills: 0.9 },
        },
      ],
    })

    expect(apiClient.getWithHeaders).toHaveBeenCalledWith(
      "/api/recruiter/vacancies/vac-1/applications?page=1&pageSize=100"
    )
    expect(merged).toMatchObject({
      id: "vac-1",
      title: "Dev",
      applicants: [
        {
          applicationId: "app-1",
          candidateProfileId: "p1",
          name: "Ana",
          matchScore: 0.86,
          applicationStage: "Aplicantes",
          qualitativeReasoning: "Buen fit .NET",
          componentScores: { Skills: 0.9 },
        },
      ],
    })
  })

  it("keeps the original payload when applications fail", async () => {
    vi.mocked(apiClient.getWithHeaders).mockRejectedValueOnce(
      new Error("unavailable")
    )
    const original = { id: "vac-1", applicants: [{ candidateProfileId: "nested" }] }
    const merged = await overlayVacancyApplicants("vac-1", original)
    expect(merged).toBe(original)
  })
})

describe("mergeApplicationWithRichMatch", () => {
  it("matches rich analysis by profile when applicationId differs in shape", () => {
    const richIndex = {
      byApplicationId: new Map<string, Record<string, unknown>>(),
      byProfileId: new Map<string, Record<string, unknown>>([
        [
          "p1",
          {
            candidateProfileId: "p1",
            qualitativeReasoningPositive: "Solid",
            componentScores: { Semantic: 0.8 },
          },
        ],
      ]),
    }

    expect(
      mergeApplicationWithRichMatch(
        {
          id: "app-9",
          candidateProfileId: "p1",
          applicationStage: "En espera",
          matchScore: 0.7,
        },
        richIndex
      )
    ).toMatchObject({
      id: "app-9",
      candidateProfileId: "p1",
      applicationStage: "En espera",
      matchScore: 0.7,
      qualitativeReasoningPositive: "Solid",
      componentScores: { Semantic: 0.8 },
    })
  })
})

describe("findApplicationIdForCandidate", () => {
  it("encuentra applicationId para el perfil", () => {
    expect(
      findApplicationIdForCandidate(
        [
          { candidateProfileId: "p1", applicationId: "app-1" },
          { candidate_profile_id: "p2", application_id: "app-2" },
        ],
        "p2"
      )
    ).toBe("app-2")
  })

  it("ignora filas sin applicationId y perfiles distintos", () => {
    expect(
      findApplicationIdForCandidate(
        [{ candidateProfileId: "p1", name: "Ana" }],
        "p1"
      )
    ).toBeNull()
    expect(
      findApplicationIdForCandidate(
        [{ candidateProfileId: "p1", applicationId: "app-1" }],
        "p9"
      )
    ).toBeNull()
  })
})
