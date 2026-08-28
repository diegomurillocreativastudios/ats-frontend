import { formatRequirementKey } from "@/lib/vacancies/format-requirement-key"
import type { ScoreEntry } from "@/lib/vacancies/partition-component-scores"

export interface AttributeTableRow {
  key: string
  label: string
  level: string | null
  score: unknown
}

function emptyToDash(value: unknown): string {
  return value != null && String(value).trim() !== "" ? String(value).trim() : "—"
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s-]+/g, "")
}

/** Stable identity for merging component scores with matched attribute levels. */
export function canonicalAttributeKey(key: unknown): string {
  const stripped = String(key ?? "").trim().replace(/^attr_/i, "")
  if (stripped === "") return ""
  return normalizeToken(formatRequirementKey(stripped))
}

function buildMatchedLevelLookup(matchedAttributes: ScoreEntry[]): Map<string, string> {
  const lookup = new Map<string, string>()
  for (const [key, value] of matchedAttributes) {
    const canonical = canonicalAttributeKey(key)
    if (canonical === "") continue
    const level = emptyToDash(value)
    if (level === "—") continue
    lookup.set(canonical, level)
  }
  return lookup
}

export function buildAttributeTableRows(
  scoreRows: ScoreEntry[],
  matchedAttributes: ScoreEntry[],
  getScoreLabel: (key: string) => string
): AttributeTableRow[] {
  const levelLookup = buildMatchedLevelLookup(matchedAttributes)
  const rowsByCanonical = new Map<string, AttributeTableRow>()

  for (const [key, score] of scoreRows) {
    const canonical = canonicalAttributeKey(key)
    if (canonical === "") continue
    rowsByCanonical.set(canonical, {
      key,
      label: getScoreLabel(key),
      level: levelLookup.get(canonical) ?? null,
      score,
    })
  }

  for (const [key, value] of matchedAttributes) {
    const canonical = canonicalAttributeKey(key)
    if (canonical === "" || rowsByCanonical.has(canonical)) continue
    rowsByCanonical.set(canonical, {
      key,
      label: formatRequirementKey(key),
      level: emptyToDash(value) === "—" ? null : emptyToDash(value),
      score: null,
    })
  }

  return [...rowsByCanonical.values()]
}
