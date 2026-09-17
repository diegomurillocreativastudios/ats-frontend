import { beforeEach, describe, expect, it, vi } from "vitest"

const apiPost = vi.fn()

vi.mock("@/lib/api", () => ({
  apiClient: {
    post: (...args: unknown[]) => apiPost(...args),
  },
}))

import {
  classifyInterviewFeedbackConflict,
  interviewFeedbackErrorKey,
  parseInterviewFeedbackResponse,
  resolveInterviewFeedbackToastKind,
  signedDeltaPointsLabel,
  submitInterviewFeedback,
  toPercentPoints,
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
  it("classifies 409 not-in-stage vs vacancy not editable", () => {
    expect(
      classifyInterviewFeedbackConflict({
        status: 409,
        body: { message: "The application is not in the interview stage." },
      })
    ).toBe("not_interview_stage")
    expect(
      classifyInterviewFeedbackConflict({
        status: 409,
        body: { message: "The vacancy is not editable." },
      })
    ).toBe("vacancy_not_editable")
    expect(classifyInterviewFeedbackConflict({ status: 400 })).toBeNull()
  })

  it("maps HTTP statuses to i18n keys", () => {
    expect(interviewFeedbackErrorKey({ status: 400 })).toBe("errorInvalid")
    expect(interviewFeedbackErrorKey({ status: 403 })).toBe("errorForbidden")
    expect(interviewFeedbackErrorKey({ status: 404 })).toBe("errorNotFound")
    expect(
      interviewFeedbackErrorKey({
        status: 409,
        body: { message: "The application is not in the interview stage." },
      })
    ).toBe("conflictNotInterview")
    expect(interviewFeedbackErrorKey({ status: 502 })).toBe("errorScoringFailed")
    expect(interviewFeedbackErrorKey({ status: 500 })).toBe("errorGeneric")
  })
})

describe("submitInterviewFeedback", () => {
  beforeEach(() => {
    apiPost.mockReset()
  })

  it("POSTs { feedback } to the application endpoint", async () => {
    apiPost.mockResolvedValueOnce({
      previousMatchScore: 0.73,
      matchScore: 0.79,
      delta: 0.06,
      qualitativeWeight: 0.2,
    })

    const result = await submitInterviewFeedback(
      "app-1",
      "  Buena comunicación  "
    )

    expect(apiPost).toHaveBeenCalledWith(
      "/api/recruiter/applications/app-1/interview-feedback",
      { feedback: "Buena comunicación" }
    )
    expect(result.matchScore).toBe(0.79)
  })
})
