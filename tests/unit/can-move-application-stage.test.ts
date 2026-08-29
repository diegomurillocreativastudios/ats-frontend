import { describe, expect, it } from "vitest"

import {
  canMoveApplicationStage,
  isRejectionShortcutStage,
  listValidMoveTargets,
  type ApplicationStageCatalogItem,
} from "@/lib/recruiter/stage-move-validation"

const canonicalCatalog: ApplicationStageCatalogItem[] = [
  { id: "s0", name: "Sourced", orderIndex: 0, final: false, isHiredStage: false },
  { id: "s1", name: "Applied", orderIndex: 1, final: false, isHiredStage: false },
  { id: "s2", name: "Screening", orderIndex: 2, final: false, isHiredStage: false },
  { id: "s3", name: "Interview", orderIndex: 3, final: false, isHiredStage: false },
  { id: "s4", name: "Offer", orderIndex: 4, final: false, isHiredStage: false },
  { id: "s5", name: "Hired", orderIndex: 5, final: true, isHiredStage: true },
  { id: "s6", name: "Rejected", orderIndex: 6, final: true, isHiredStage: false },
]

function stageNamed(
  catalog: ApplicationStageCatalogItem[],
  name: string
): ApplicationStageCatalogItem {
  const found = catalog.find((stage) => stage.name === name)
  if (!found) throw new Error(`missing stage ${name}`)
  return found
}

describe("canMoveApplicationStage", () => {
  it("allows moving to the next adjacent stage", () => {
    expect(canMoveApplicationStage("Applied", "Screening", canonicalCatalog)).toBe(
      true
    )
  })

  it("allows moving to the previous adjacent stage", () => {
    expect(canMoveApplicationStage("Screening", "Applied", canonicalCatalog)).toBe(
      true
    )
  })

  it("blocks skipping to Interview", () => {
    expect(canMoveApplicationStage("Applied", "Interview", canonicalCatalog)).toBe(
      false
    )
  })

  it("blocks skipping to Hired", () => {
    expect(canMoveApplicationStage("Applied", "Hired", canonicalCatalog)).toBe(
      false
    )
  })

  it("allows Offer to Hired as neighbors", () => {
    expect(canMoveApplicationStage("Offer", "Hired", canonicalCatalog)).toBe(true)
  })

  it("allows any origin to a final non-hired shortcut stage", () => {
    expect(canMoveApplicationStage("Applied", "Rejected", canonicalCatalog)).toBe(
      true
    )
    expect(canMoveApplicationStage("Interview", "Rejected", canonicalCatalog)).toBe(
      true
    )
    expect(canMoveApplicationStage("Offer", "Rejected", canonicalCatalog)).toBe(
      true
    )
    expect(canMoveApplicationStage("Screening", "Rejected", canonicalCatalog)).toBe(
      true
    )
  })

  it("allows shortcut by flags even when the stage is not named Rejected", () => {
    const catalog = canonicalCatalog.map((stage) =>
      stage.id === "s6" ? { ...stage, name: "No seleccionado" } : stage
    )
    expect(
      canMoveApplicationStage("Applied", "No seleccionado", catalog)
    ).toBe(true)
  })

  it("does not treat a final hired stage as a shortcut when it is not adjacent", () => {
    expect(canMoveApplicationStage("Screening", "Hired", canonicalCatalog)).toBe(
      false
    )
  })

  it("blocks a non-final non-hired stage that is not adjacent", () => {
    expect(canMoveApplicationStage("Applied", "Offer", canonicalCatalog)).toBe(
      false
    )
  })

  it("allows staying on the same stage as a no-op", () => {
    expect(canMoveApplicationStage("Applied", "Applied", canonicalCatalog)).toBe(
      true
    )
    expect(
      canMoveApplicationStage({ id: "s1" }, { id: "s1" }, canonicalCatalog)
    ).toBe(true)
  })

  it("treats orderIndex gaps as adjacent when they are neighbors in the sorted catalog", () => {
    const sparse: ApplicationStageCatalogItem[] = [
      { id: "a", name: "First", orderIndex: 0, final: false, isHiredStage: false },
      { id: "b", name: "Last", orderIndex: 10, final: false, isHiredStage: false },
    ]
    expect(canMoveApplicationStage("First", "Last", sparse)).toBe(true)
    expect(canMoveApplicationStage("Last", "First", sparse)).toBe(true)
  })

  it("does not use the stage name to decide the shortcut", () => {
    const catalog = canonicalCatalog.map((stage) =>
      stage.id === "s6"
        ? { ...stage, name: "Rejected", final: false, isHiredStage: false }
        : stage
    )
    expect(canMoveApplicationStage("Applied", "Rejected", catalog)).toBe(false)
  })

  it("allows a shortcut from an origin that is missing in the catalog", () => {
    expect(
      canMoveApplicationStage("Custom origin", "Rejected", canonicalCatalog)
    ).toBe(true)
  })

  it("resolves current and target by id without using names for the rule", () => {
    expect(
      canMoveApplicationStage(
        { id: "s1" },
        { id: "s2" },
        canonicalCatalog
      )
    ).toBe(true)
    expect(
      canMoveApplicationStage(
        { id: "s1" },
        { id: "s5" },
        canonicalCatalog
      )
    ).toBe(false)
  })
})

describe("isRejectionShortcutStage", () => {
  it("is true only when final is true and isHiredStage is not true", () => {
    expect(isRejectionShortcutStage(stageNamed(canonicalCatalog, "Rejected"))).toBe(
      true
    )
    expect(isRejectionShortcutStage(stageNamed(canonicalCatalog, "Hired"))).toBe(
      false
    )
    expect(isRejectionShortcutStage(stageNamed(canonicalCatalog, "Applied"))).toBe(
      false
    )
  })
})

describe("listValidMoveTargets", () => {
  it("lists previous, next, and every shortcut stage from Applied", () => {
    const names = listValidMoveTargets("Applied", canonicalCatalog).map(
      (stage) => stage.name
    )
    expect(names).toEqual(["Sourced", "Screening", "Rejected"])
  })

  it("includes Hired only when it is the adjacent neighbor", () => {
    const fromOffer = listValidMoveTargets("Offer", canonicalCatalog).map(
      (stage) => stage.name
    )
    expect(fromOffer).toEqual(["Interview", "Hired", "Rejected"])

    const fromApplied = listValidMoveTargets("Applied", canonicalCatalog).map(
      (stage) => stage.name
    )
    expect(fromApplied).not.toContain("Hired")
  })

  it("keeps only the previous neighbor when the application status is not final", () => {
    const statuses = [
      { id: "st-open", name: "Por iniciar", final: false },
      { id: "st-done", name: "Concluido", final: true },
    ]
    const names = listValidMoveTargets(
      "Screening",
      canonicalCatalog,
      "st-open",
      statuses
    ).map((stage) => stage.name)
    expect(names).toEqual(["Applied"])
  })

  it("allows next and shortcut when the application status is final", () => {
    const statuses = [
      { id: "st-open", name: "Por iniciar", final: false },
      { id: "st-done", name: "Concluido", final: true },
    ]
    const names = listValidMoveTargets(
      "Applied",
      canonicalCatalog,
      "st-done",
      statuses
    ).map((stage) => stage.name)
    expect(names).toEqual(["Sourced", "Screening", "Rejected"])
  })
})
