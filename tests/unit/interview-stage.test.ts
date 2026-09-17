import { describe, expect, it } from "vitest"
import {
  applyInterviewStageToggleLocal,
  canEnableFinalOrHiredStage,
  canEnableInterviewStage,
  canShowInterviewFeedbackAction,
  isInterviewPipelineStage,
  readIsInterviewStageFromApi,
} from "@/lib/recruiter/interview-stage"

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

describe("canShowInterviewFeedbackAction", () => {
  it("shows the button only on the interview stage with an application id", () => {
    expect(
      canShowInterviewFeedbackAction({
        isInterviewStage: true,
        applicationId: "app-1",
        readOnly: false,
      })
    ).toBe(true)
  })

  it("hides the button on other stages", () => {
    expect(
      canShowInterviewFeedbackAction({
        isInterviewStage: false,
        applicationId: "app-1",
        readOnly: false,
      })
    ).toBe(false)
  })

  it("hides the button on a read-only vacancy", () => {
    expect(
      canShowInterviewFeedbackAction({
        isInterviewStage: true,
        applicationId: "app-1",
        readOnly: true,
      })
    ).toBe(false)
  })

  it("hides the button without applicationId", () => {
    expect(
      canShowInterviewFeedbackAction({
        isInterviewStage: true,
        applicationId: "  ",
        readOnly: false,
      })
    ).toBe(false)
  })
})
