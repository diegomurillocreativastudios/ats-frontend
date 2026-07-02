export type AtsComplianceStatus = "Met" | "Partial" | "Missing" | "NotApplicable"
export type AtsGapType = "RealGap" | "WritingGap" | "NotApplicable"

export interface AtsComplianceChecklistItem {
  id: string
  label: string
  status: AtsComplianceStatus
  gapType: AtsGapType
  note: string
  evidence?: string[]
  suggestedAction?: string | null
}

export const ATS_COMPLIANCE_UNEVALUATED_NOTE = "No evaluado por el modelo."

const ATS_COMPLIANCE_STATUSES: AtsComplianceStatus[] = [
  "Met",
  "Partial",
  "Missing",
  "NotApplicable",
]

const ATS_GAP_TYPES: AtsGapType[] = ["RealGap", "WritingGap", "NotApplicable"]

export interface AtsComplianceSummary {
  met: number
  total: number
}

export function parseAtsComplianceStatus(value: unknown): AtsComplianceStatus | null {
  const raw = value == null ? "" : String(value).trim()
  return ATS_COMPLIANCE_STATUSES.includes(raw as AtsComplianceStatus)
    ? (raw as AtsComplianceStatus)
    : null
}

export function parseAtsGapType(value: unknown): AtsGapType | null {
  const raw = value == null ? "" : String(value).trim()
  return ATS_GAP_TYPES.includes(raw as AtsGapType) ? (raw as AtsGapType) : null
}

export function normalizeAtsComplianceChecklist(raw: unknown): AtsComplianceChecklistItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (item == null || typeof item !== "object") return null
      const o = item as Record<string, unknown>
      const id = o.id == null ? "" : String(o.id).trim()
      const label = o.label == null ? "" : String(o.label).trim()
      const status = parseAtsComplianceStatus(o.status)
      const gapType = parseAtsGapType(o.gapType)
      if (!id || !label || !status || !gapType) return null
      const note = o.note == null ? "" : String(o.note)
      const evidence = Array.isArray(o.evidence)
        ? o.evidence
            .map((entry) => (entry == null ? "" : String(entry).trim()))
            .filter((entry) => entry.length > 0)
        : undefined
      const suggestedAction =
        o.suggestedAction == null
          ? undefined
          : String(o.suggestedAction).trim() || null
      return {
        id,
        label,
        status,
        gapType,
        note,
        ...(evidence && evidence.length > 0 ? { evidence } : {}),
        ...(suggestedAction != null ? { suggestedAction } : {}),
      } satisfies AtsComplianceChecklistItem
    })
    .filter((item): item is AtsComplianceChecklistItem => item != null)
}

export function computeAtsComplianceSummary(
  checklist: AtsComplianceChecklistItem[]
): AtsComplianceSummary {
  const applicable = checklist.filter((item) => item.status !== "NotApplicable")
  const met = applicable.filter((item) => item.status === "Met").length
  return { met, total: applicable.length }
}

export function hasUnevaluatedAtsCriteria(checklist: AtsComplianceChecklistItem[]): boolean {
  return checklist.some((item) => item.note.trim() === ATS_COMPLIANCE_UNEVALUATED_NOTE)
}

export function shouldShowAtsGapChip(item: AtsComplianceChecklistItem): boolean {
  if (item.gapType === "WritingGap" && (item.status === "Partial" || item.status === "Missing")) {
    return true
  }
  if (item.gapType === "RealGap" && item.status === "Missing") {
    return true
  }
  return false
}

export function isMinimumExperienceCriterion(item: AtsComplianceChecklistItem): boolean {
  return item.id === "minimum_experience"
}

export type AtsComplianceSectionMode = "checklist" | "legacy" | "hidden"

export function resolveAtsComplianceSectionMode(
  promptVersion: string | null,
  checklist: AtsComplianceChecklistItem[]
): AtsComplianceSectionMode {
  if (promptVersion === "v1") return "legacy"
  if (checklist.length > 0) return "checklist"
  return "hidden"
}
