import { describe, expect, it } from "vitest"

import {
  validateStageMove,
  type ApplicantStatusOption,
  type PipelineStage,
} from "@/lib/recruiter/stage-move-validation"

const stages: PipelineStage[] = [
  { id: "1", name: "Screening", order: 0 },
  { id: "2", name: "Interview", order: 1 },
  { id: "3", name: "Offer", order: 2 },
  { id: "4", name: "Hired", order: 3 },
]

const statuses: ApplicantStatusOption[] = [
  { id: "s1", name: "En revisión", final: false },
  { id: "s2", name: "Completado", final: true },
]

describe("validateStageMove", () => {
  it("allows moving to the next consecutive stage when status is final", () => {
    expect(
      validateStageMove("Screening", "Interview", stages, "s2", statuses)
    ).toEqual({ allowed: true, code: "ok" })
  })

  it("blocks skipping multiple stages forward", () => {
    expect(
      validateStageMove("Screening", "Hired", stages, "s2", statuses)
    ).toEqual({ allowed: false, code: "skip_not_allowed" })
  })

  it("blocks skipping multiple stages backward", () => {
    expect(
      validateStageMove("Hired", "Screening", stages, "s2", statuses)
    ).toEqual({ allowed: false, code: "skip_not_allowed" })
  })

  it("allows moving one stage backward without final status", () => {
    expect(
      validateStageMove("Interview", "Screening", stages, "s1", statuses)
    ).toEqual({ allowed: true, code: "ok" })
  })

  it("blocks forward move when current status is not final", () => {
    expect(
      validateStageMove("Screening", "Interview", stages, "s1", statuses)
    ).toEqual({ allowed: false, code: "final_status_required" })
  })

  it("allows forward move when no statuses are configured", () => {
    expect(
      validateStageMove("Screening", "Interview", stages, "s1", [])
    ).toEqual({ allowed: true, code: "ok" })
  })

  it("blocks move when stage names are unknown", () => {
    expect(
      validateStageMove("Unknown", "Interview", stages, "s2", statuses)
    ).toEqual({ allowed: false, code: "skip_not_allowed" })
  })
})
