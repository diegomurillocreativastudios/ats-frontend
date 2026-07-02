import { describe, it, expect } from "vitest"
import {
  ATS_COMPLIANCE_UNEVALUATED_NOTE,
  computeAtsComplianceSummary,
  hasUnevaluatedAtsCriteria,
  normalizeAtsComplianceChecklist,
  resolveAtsComplianceSectionMode,
  shouldShowAtsGapChip,
} from "@/lib/ats-compliance-checklist"

const sampleChecklist = normalizeAtsComplianceChecklist([
  {
    id: "readable_format",
    label: "Formato legible",
    status: "Met",
    gapType: "NotApplicable",
    note: "CV en texto plano.",
    evidence: ["Resumen claro"],
  },
  {
    id: "vacancy_keywords",
    label: "Keywords de la vacante",
    status: "Partial",
    gapType: "WritingGap",
    note: "Faltan términos clave.",
    suggestedAction: "Reforzá el titular.",
  },
  {
    id: "minimum_experience",
    label: "Experiencia mínima / knock-out criteria",
    status: "NotApplicable",
    gapType: "NotApplicable",
    note: "",
  },
  {
    id: "language",
    label: "Idioma",
    status: "Missing",
    gapType: "RealGap",
    note: "No se declaró inglés.",
  },
])

describe("normalizeAtsComplianceChecklist", () => {
  it("parses PascalCase enums and optional fields", () => {
    expect(sampleChecklist).toHaveLength(4)
    expect(sampleChecklist[0]?.status).toBe("Met")
    expect(sampleChecklist[1]?.gapType).toBe("WritingGap")
    expect(sampleChecklist[1]?.evidence).toBeUndefined()
    expect(sampleChecklist[1]?.suggestedAction).toBe("Reforzá el titular.")
  })

  it("skips invalid items", () => {
    const result = normalizeAtsComplianceChecklist([
      { id: "x", label: "X", status: "Invalid", gapType: "RealGap", note: "" },
    ])
    expect(result).toHaveLength(0)
  })
})

describe("computeAtsComplianceSummary", () => {
  it("excludes NotApplicable from the total", () => {
    expect(computeAtsComplianceSummary(sampleChecklist)).toEqual({ met: 1, total: 3 })
  })
})

describe("shouldShowAtsGapChip", () => {
  it("shows writing gap chip for partial or missing writing gaps", () => {
    expect(shouldShowAtsGapChip(sampleChecklist[1]!)).toBe(true)
    expect(shouldShowAtsGapChip(sampleChecklist[0]!)).toBe(false)
  })

  it("shows real gap chip only for missing real gaps", () => {
    expect(shouldShowAtsGapChip(sampleChecklist[3]!)).toBe(true)
  })
})

describe("hasUnevaluatedAtsCriteria", () => {
  it("detects model fallback notes", () => {
    expect(
      hasUnevaluatedAtsCriteria([
        {
          id: "title_match",
          label: "Match de cargo",
          status: "Partial",
          gapType: "WritingGap",
          note: ATS_COMPLIANCE_UNEVALUATED_NOTE,
        },
      ])
    ).toBe(true)
  })
})

describe("resolveAtsComplianceSectionMode", () => {
  it("returns legacy for v1 versions", () => {
    expect(resolveAtsComplianceSectionMode("v1", [])).toBe("legacy")
  })

  it("returns checklist when items exist", () => {
    expect(resolveAtsComplianceSectionMode("v2", sampleChecklist)).toBe("checklist")
  })

  it("returns hidden for empty non-v1 checklists", () => {
    expect(resolveAtsComplianceSectionMode("v2", [])).toBe("hidden")
  })
})
