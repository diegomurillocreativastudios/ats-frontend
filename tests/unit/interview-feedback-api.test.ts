import { beforeEach, describe, expect, it, vi } from "vitest"

const apiPost = vi.fn()
const apiGet = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    post: (...args: unknown[]) => apiPost(...args),
    get: (...args: unknown[]) => apiGet(...args),
  },
}))

import {
  classifyInterviewFeedbackConflict,
  fetchInterviewFeedbackForm,
  interviewFeedbackErrorKey,
  parseInterviewFeedbackForm,
  parseInterviewFeedbackResponse,
  resolveInterviewFeedbackToastKind,
  signedDeltaPointsLabel,
  submitInterviewFeedback,
  toPercentPoints,
  validateInterviewFeedbackCoverage,
} from "@/lib/api/interview-feedback"

describe("interview feedback score formatting", () => {
  it("converts 0–1 scores to whole percentage points", () => {
    expect(toPercentPoints(0.73)).toBe(73)
    expect(toPercentPoints(0.81)).toBe(81)
  })

  it("formats positive and negative delta as points, not percents of percents", () => {
    expect(signedDeltaPointsLabel(0.08)).toBe("+8")
    expect(signedDeltaPointsLabel(-0.07)).toBe("-7")
    expect(signedDeltaPointsLabel(0)).toBe("0")
  })
})

describe("parseInterviewFeedbackResponse", () => {
  it("reads the contracted 0–1 fields", () => {
    expect(
      parseInterviewFeedbackResponse({
        previousMatchScore: 0.73,
        matchScore: 0.81,
        delta: 0.08,
        qualitativeWeight: 0.2,
      })
    ).toMatchObject({
      previousMatchScore: 0.73,
      matchScore: 0.81,
      delta: 0.08,
      qualitativeWeight: 0.2,
    })
  })
})

describe("parseInterviewFeedbackForm", () => {
  it("reads soft skills, technical skills, and entries", () => {
    const form = parseInterviewFeedbackForm({
      interviewDone: true,
      softSkills: [
        {
          id: "soft-1",
          code: "comunicacion",
          displayName: "Comunicación",
          sortOrder: 2,
        },
        {
          id: "soft-0",
          code: "liderazgo",
          displayName: "Liderazgo",
          sortOrder: 1,
        },
      ],
      technicalSkills: [
        { requirementKey: "reactjs", expectedValue: "Avanzado" },
      ],
      entries: [
        {
          id: "entry-1",
          feedback: "Buena comunicación.",
          createdBy: "recruiter@example.com",
          createdAt: "2026-09-18T12:00:00Z",
          previousMatchScore: 0.5,
          matchScore: 0.57,
          delta: 0.07,
          softSkills: [
            { softSkillId: "soft-0", displayName: "Liderazgo", score: 8 },
          ],
          technicalSkills: [
            {
              requirementKey: "reactjs",
              expectedValue: "Avanzado",
              score: 7,
            },
          ],
        },
      ],
    })

    expect(form.interviewDone).toBe(true)
    expect(form.softSkills.map((item) => item.id)).toEqual(["soft-0", "soft-1"])
    expect(form.technicalSkills).toEqual([
      { requirementKey: "reactjs", expectedValue: "Avanzado" },
    ])
    expect(form.entries).toHaveLength(1)
    expect(form.entries[0]?.softSkills[0]?.score).toBe(8)
  })
})

describe("validateInterviewFeedbackCoverage", () => {
  it("requires every form skill and integer scores 1–10", () => {
    expect(
      validateInterviewFeedbackCoverage({
        softSkillIds: ["a", "b"],
        technicalRequirementKeys: ["reactjs"],
        softSkills: [
          { softSkillId: "a", score: 8 },
          { softSkillId: "b", score: 5 },
        ],
        technicalSkills: [{ requirementKey: "reactjs", score: 7 }],
      })
    ).toBe(true)

    expect(
      validateInterviewFeedbackCoverage({
        softSkillIds: ["a"],
        technicalRequirementKeys: [],
        softSkills: [{ softSkillId: "a", score: null }],
        technicalSkills: [],
      })
    ).toBe(false)

    expect(
      validateInterviewFeedbackCoverage({
        softSkillIds: [],
        technicalRequirementKeys: [],
        softSkills: [],
        technicalSkills: [],
      })
    ).toBe(true)
  })
})

describe("resolveInterviewFeedbackToastKind", () => {
  it("classifies increase, decrease, zero, and zero without qualitative weight", () => {
    expect(
      resolveInterviewFeedbackToastKind({
        previousMatchScore: 0.73,
        matchScore: 0.81,
        delta: 0.08,
      })
    ).toBe("increased")
    expect(
      resolveInterviewFeedbackToastKind({
        previousMatchScore: 0.81,
        matchScore: 0.74,
        delta: -0.07,
      })
    ).toBe("decreased")
    expect(
      resolveInterviewFeedbackToastKind({
        previousMatchScore: 0.73,
        matchScore: 0.73,
        delta: 0,
        qualitativeWeight: 0.2,
      })
    ).toBe("unchanged")
    expect(
      resolveInterviewFeedbackToastKind({
        previousMatchScore: 0.73,
        matchScore: 0.73,
        delta: 0,
        qualitativeWeight: 0,
      })
    ).toBe("unchangedNoWeight")
  })
})

describe("interview feedback conflicts", () => {
  it("classifies 409 by code and message fallbacks", () => {
    expect(
      classifyInterviewFeedbackConflict({
        status: 409,
        body: { code: "not_interview_stage", message: "..." },
      })
    ).toBe("not_interview_stage")
    expect(
      classifyInterviewFeedbackConflict({
        status: 409,
        body: { code: "interview_not_done", message: "..." },
      })
    ).toBe("interview_not_done")
    expect(
      classifyInterviewFeedbackConflict({
        status: 409,
        body: { message: "The vacancy is not editable." },
      })
    ).toBe("vacancy_not_editable")
    expect(
      classifyInterviewFeedbackConflict({
        status: 409,
        body: { message: "The interview has not been marked as done." },
      })
    ).toBe("interview_not_done")
    expect(classifyInterviewFeedbackConflict({ status: 400 })).toBeNull()
  })

  it("maps HTTP statuses to i18n keys", () => {
    expect(interviewFeedbackErrorKey({ status: 400 })).toBe("errorInvalid")
    expect(interviewFeedbackErrorKey({ status: 403 })).toBe("errorForbidden")
    expect(interviewFeedbackErrorKey({ status: 404 })).toBe("errorNotFound")
    expect(
      interviewFeedbackErrorKey({
        status: 409,
        body: { code: "not_interview_stage" },
      })
    ).toBe("conflictNotInterview")
    expect(
      interviewFeedbackErrorKey({
        status: 409,
        body: { code: "interview_not_done" },
      })
    ).toBe("conflictInterviewNotDone")
    expect(interviewFeedbackErrorKey({ status: 502 })).toBe("errorScoringFailed")
    expect(interviewFeedbackErrorKey({ status: 500 })).toBe("errorGeneric")
  })
})

describe("fetchInterviewFeedbackForm", () => {
  beforeEach(() => {
    apiGet.mockReset()
  })

  it("GETs the application interview-feedback form", async () => {
    apiGet.mockResolvedValueOnce({
      interviewDone: true,
      softSkills: [],
      technicalSkills: [],
      entries: [],
    })

    const form = await fetchInterviewFeedbackForm("app-1")

    expect(apiGet).toHaveBeenCalledWith(
      "/api/recruiter/applications/app-1/interview-feedback"
    )
    expect(form.interviewDone).toBe(true)
  })
})

describe("submitInterviewFeedback", () => {
  beforeEach(() => {
    apiPost.mockReset()
  })

  it("POSTs feedback plus soft and technical skill scores", async () => {
    apiPost.mockResolvedValueOnce({
      previousMatchScore: 0.73,
      matchScore: 0.79,
      delta: 0.06,
      qualitativeWeight: 0.2,
    })

    const result = await submitInterviewFeedback("app-1", {
      feedback: "  Buena comunicación  ",
      softSkills: [{ softSkillId: "soft-1", score: 8 }],
      technicalSkills: [{ requirementKey: "reactjs", score: 7 }],
    })

    expect(apiPost).toHaveBeenCalledWith(
      "/api/recruiter/applications/app-1/interview-feedback",
      {
        feedback: "Buena comunicación",
        softSkills: [{ softSkillId: "soft-1", score: 8 }],
        technicalSkills: [{ requirementKey: "reactjs", score: 7 }],
      }
    )
    expect(result.matchScore).toBe(0.79)
  })
})
