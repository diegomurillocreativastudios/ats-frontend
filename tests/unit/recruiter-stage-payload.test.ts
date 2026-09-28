import { describe, expect, it } from "vitest"
import { buildRecruiterStagePutPayload } from "@/lib/recruiterStagePayload"

describe("buildRecruiterStagePutPayload", () => {
  it("omits isInterviewStage so a rename or reorder cannot send false by default", () => {
    const payload = buildRecruiterStagePutPayload({
      name: "Interview",
      orderIndex: 3,
      isDefault: false,
      final: false,
      isHiredStage: false,
      isInterviewStage: true,
    })

    expect(payload).toEqual({
      name: "Interview",
      orderIndex: 3,
      isDefault: false,
      final: false,
      isHiredStage: false,
    })
    expect(payload).not.toHaveProperty("isInterviewStage")
  })
})
