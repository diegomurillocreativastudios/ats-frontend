import { describe, expect, it } from "vitest"
import {
  applyInterviewDoneToggleLocal,
  applyInterviewStageToggleLocal,
  canEnableFinalOrHiredStage,
  canEnableInterviewStage,
  canShowInterviewFeedbackAction,
  isInterviewPipelineStage,
  readHasInterviewFeedbackFromApplicant,
  readInterviewDoneFromApplicant,
  readIsInterviewStageFromApi,
  validateInterviewStageLeaveMove,
} from "@/lib/recruiter/interview-stage"

const catalog = [
  { id: "s1", name: "Screening", orderIndex: 1, final: false, isHiredStage: false },
  {
    id: "s2",
    name: "Interview",
    orderIndex: 2,
    final: false,
    isHiredStage: false,
    isInterviewStage: true,
  },
  { id: "s3", name: "Offer", orderIndex: 3, final: false, isHiredStage: false },
  {
    id: "s4",
    name: "Hired",
    orderIndex: 4,
    final: true,
    isHiredStage: true,
  },
  {
    id: "s5",
    name: "Rejected",
    orderIndex: 5,
    final: true,
    isHiredStage: false,
  },
] as const

describe("readIsInterviewStageFromApi", () => {
  it("reads camelCase, snake_case, and PascalCase flags", () => {
    expect(readIsInterviewStageFromApi({ isInterviewStage: true })).toBe(true)
    expect(readIsInterviewStageFromApi({ is_interview_stage: true })).toBe(true)
    expect(readIsInterviewStageFromApi({ IsInterviewStage: true })).toBe(true)
    expect(readIsInterviewStageFromApi({ name: "Interview" })).toBe(false)
  })
})

describe("interview stage flag compatibility", () => {
  it("does not enable interview on a final or hired stage", () => {
    expect(canEnableInterviewStage({ final: true, isHiredStage: false })).toBe(
      false
    )
    expect(canEnableInterviewStage({ final: false, isHiredStage: true })).toBe(
      false
    )
    expect(canEnableInterviewStage({ final: false, isHiredStage: false })).toBe(
      true
    )
  })

  it("does not enable final or hired on the interview stage", () => {
    expect(canEnableFinalOrHiredStage({ isInterviewStage: true })).toBe(false)
    expect(canEnableFinalOrHiredStage({ isInterviewStage: false })).toBe(true)
  })

  it("never treats a name as interview identity", () => {
    expect(isInterviewPipelineStage({ isInterviewStage: false })).toBe(false)
    expect(isInterviewPipelineStage({ isInterviewStage: true })).toBe(true)
  })
})

describe("applyInterviewStageToggleLocal", () => {
  it("clears the previous interview stage when enabling another", () => {
    const next = applyInterviewStageToggleLocal(
      [
        { id: "a", isInterviewStage: true },
        { id: "b", isInterviewStage: false },
      ],
      "b",
      true
    )
    expect(next.find((s) => s.id === "a")?.isInterviewStage).toBe(false)
    expect(next.find((s) => s.id === "b")?.isInterviewStage).toBe(true)
  })
})

describe("applyInterviewDoneToggleLocal", () => {
  it("clears the previous interview-done status when enabling another", () => {
    const next = applyInterviewDoneToggleLocal(
      [
        { id: "a", isInterviewDone: true },
        { id: "b", isInterviewDone: false },
      ],
      "b",
      true
    )
    expect(next.find((s) => s.id === "a")?.isInterviewDone).toBe(false)
    expect(next.find((s) => s.id === "b")?.isInterviewDone).toBe(true)
  })
})

describe("readInterviewDoneFromApplicant", () => {
  it("reads camelCase and snake_case flags", () => {
    expect(readInterviewDoneFromApplicant({ interviewDone: true })).toBe(true)
    expect(readInterviewDoneFromApplicant({ interview_done: true })).toBe(true)
    expect(readInterviewDoneFromApplicant({ InterviewDone: true })).toBe(true)
    expect(readInterviewDoneFromApplicant({})).toBe(false)
  })
})

describe("readHasInterviewFeedbackFromApplicant", () => {
  it("reads camelCase, snake_case, and PascalCase flags", () => {
    expect(
      readHasInterviewFeedbackFromApplicant({ hasInterviewFeedback: true })
    ).toBe(true)
    expect(
      readHasInterviewFeedbackFromApplicant({ has_interview_feedback: true })
    ).toBe(true)
    expect(
      readHasInterviewFeedbackFromApplicant({ HasInterviewFeedback: true })
    ).toBe(true)
    expect(readHasInterviewFeedbackFromApplicant({})).toBe(false)
  })
})

describe("validateInterviewStageLeaveMove", () => {
  it("allows moving into the interview stage without flags", () => {
    expect(
      validateInterviewStageLeaveMove({
        current: "s1",
        target: "s2",
        catalog,
        interviewDone: false,
        hasInterviewFeedback: false,
      })
    ).toEqual({ allowed: true, code: "ok" })
  })

  it("allows moving backward from interview without flags", () => {
    expect(
      validateInterviewStageLeaveMove({
        current: "s2",
        target: "s1",
        catalog,
        interviewDone: false,
        hasInterviewFeedback: false,
      })
    ).toEqual({ allowed: true, code: "ok" })
  })

  it("allows rejecting from interview without flags", () => {
    expect(
      validateInterviewStageLeaveMove({
        current: "s2",
        target: "s5",
        catalog,
        interviewDone: false,
        hasInterviewFeedback: false,
      })
    ).toEqual({ allowed: true, code: "ok" })
  })

  it("blocks forward leave without interviewDone", () => {
    expect(
      validateInterviewStageLeaveMove({
        current: "s2",
        target: "s3",
        catalog,
        interviewDone: false,
        hasInterviewFeedback: false,
      })
    ).toEqual({ allowed: false, code: "interview_not_done" })
  })

  it("blocks forward leave without feedback when interviewDone", () => {
    expect(
      validateInterviewStageLeaveMove({
        current: "s2",
        target: "s3",
        catalog,
        interviewDone: true,
        hasInterviewFeedback: false,
      })
    ).toEqual({ allowed: false, code: "interview_feedback_required" })
  })

  it("allows forward leave when both flags are true", () => {
    expect(
      validateInterviewStageLeaveMove({
        current: "s2",
        target: "s3",
        catalog,
        interviewDone: true,
        hasInterviewFeedback: true,
      })
    ).toEqual({ allowed: true, code: "ok" })
  })
})

describe("canShowInterviewFeedbackAction", () => {
  it("shows the button only on the interview stage with interviewDone and an application id", () => {
    expect(
      canShowInterviewFeedbackAction({
        isInterviewStage: true,
        interviewDone: true,
        applicationId: "app-1",
        readOnly: false,
      })
    ).toBe(true)
  })

  it("hides the button when interviewDone is false", () => {
    expect(
      canShowInterviewFeedbackAction({
        isInterviewStage: true,
        interviewDone: false,
        applicationId: "app-1",
        readOnly: false,
      })
    ).toBe(false)
  })

  it("hides the button on other stages", () => {
    expect(
      canShowInterviewFeedbackAction({
        isInterviewStage: false,
        interviewDone: true,
        applicationId: "app-1",
        readOnly: false,
      })
    ).toBe(false)
  })

  it("hides the button on a read-only vacancy", () => {
    expect(
      canShowInterviewFeedbackAction({
        isInterviewStage: true,
        interviewDone: true,
        applicationId: "app-1",
        readOnly: true,
      })
    ).toBe(false)
  })

  it("hides the button without applicationId", () => {
    expect(
      canShowInterviewFeedbackAction({
        isInterviewStage: true,
        interviewDone: true,
        applicationId: "  ",
        readOnly: false,
      })
    ).toBe(false)
  })
})
