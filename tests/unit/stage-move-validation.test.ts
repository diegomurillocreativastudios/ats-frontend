import { describe, expect, it } from "vitest"

import { validateStageMove } from "@/lib/recruiter/stage-move-validation"

const catalog = [
  { id: "s1", name: "Applied", orderIndex: 1, final: false, isHiredStage: false },
  { id: "s2", name: "Screening", orderIndex: 2, final: false, isHiredStage: false },
  { id: "s3", name: "Interview", orderIndex: 3, final: false, isHiredStage: false },
  { id: "s4", name: "Offer", orderIndex: 4, final: false, isHiredStage: false },
  { id: "s5", name: "Hired", orderIndex: 5, final: true, isHiredStage: true },
  { id: "s6", name: "Rejected", orderIndex: 6, final: true, isHiredStage: false },
]

const statuses = [
  { id: "st-open", name: "Por iniciar", final: false },
  { id: "st-progress", name: "En progreso", final: false },
  { id: "st-done", name: "Concluido", final: true },
]

describe("validateStageMove", () => {
  it("allows a forward neighbor when the application status is final", () => {
    expect(
      validateStageMove("Applied", "Screening", catalog, "st-done", statuses)
    ).toEqual({
      allowed: true,
      code: "ok",
    })
  })

  it("blocks a forward neighbor when the application status is not final", () => {
    expect(
      validateStageMove("Applied", "Screening", catalog, "st-open", statuses)
    ).toEqual({
      allowed: false,
      code: "final_status_required",
    })
  })

  it("allows moving one stage backward without a final application status", () => {
    expect(
      validateStageMove("Screening", "Applied", catalog, "st-open", statuses)
    ).toEqual({
      allowed: true,
      code: "ok",
    })
  })

  it("blocks the rejection shortcut when the application status is not final", () => {
    expect(
      validateStageMove("Applied", "Rejected", catalog, "st-progress", statuses)
    ).toEqual({
      allowed: false,
      code: "final_status_required",
    })
  })

  it("allows the rejection shortcut when the application status is final", () => {
    expect(
      validateStageMove("Applied", "Rejected", catalog, "st-done", statuses)
    ).toEqual({
      allowed: true,
      code: "ok",
    })
  })

  it("blocks Offer to Hired when the application status is not final", () => {
    expect(
      validateStageMove("Offer", "Hired", catalog, "st-open", statuses)
    ).toEqual({
      allowed: false,
      code: "final_status_required",
    })
  })

  it("wraps an illegal skip as skip_not_allowed even with a final status", () => {
    expect(
      validateStageMove("Applied", "Interview", catalog, "st-done", statuses)
    ).toEqual({
      allowed: false,
      code: "skip_not_allowed",
    })
  })

  it("allows geometry-valid moves when no application statuses are configured", () => {
    expect(validateStageMove("Applied", "Screening", catalog)).toEqual({
      allowed: true,
      code: "ok",
    })
    expect(validateStageMove("Applied", "Rejected", catalog)).toEqual({
      allowed: true,
      code: "ok",
    })
  })
})
