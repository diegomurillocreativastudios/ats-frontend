import { describe, expect, it } from "vitest"
import { normalizeCandidateApplicationByVacancy } from "@/lib/candidate-application-by-vacancy"

describe("normalizeCandidateApplicationByVacancy", () => {
  it("maps hasApplied false when empty", () => {
    expect(normalizeCandidateApplicationByVacancy(null)).toEqual({
      hasApplied: false,
    })
  })

  it("maps application metadata when hasApplied", () => {
    expect(
      normalizeCandidateApplicationByVacancy({
        hasApplied: true,
        applicationId: "app-1",
        statusLabel: "Active",
        currentStageId: "stage-1",
        currentStageName: "Screening",
      })
    ).toEqual({
      hasApplied: true,
      applicationId: "app-1",
      statusLabel: "Active",
      currentStageId: "stage-1",
      currentStageName: "Screening",
    })
  })
})
