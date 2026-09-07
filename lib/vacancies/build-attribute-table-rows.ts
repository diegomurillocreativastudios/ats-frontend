import { formatRequirementKey } from "@/lib/vacancies/format-requirement-key"
import type { ScoreEntry } from "@/lib/vacancies/partition-component-scores"

export interface AttributeTableRow {
  key: string
  label: string
  level: string | null
  score: unknown
}

export const MATCHED_ATTRIBUTE_RECORD_KEYS = [
  "matchedAttributes",
  "MatchedAttributes",
  "matched_attributes",
] as const

export const COMPONENT_SCORE_RECORD_KEYS = [
  "componentScores",
  "ComponentScores",
  "component_scores",
] as const

const NESTED_LEVEL_KEYS = [
  "evidence",
  "Evidence",
  "level",
  "Level",
  "description",
  "Description",
  "detail",
  "Detail",
  "text",
  "Text",
  "note",
  "Note",
  "value",
  "Value",
] as const

function isBooleanLikeLevel(value: unknown): boolean {
  if (typeof value === "boolean") return true
  if (typeof value !== "string") return false
  const normalized = value.trim().toLowerCase()
  return normalized === "true" || normalized === "false"
}

/**
 * First object record found under any of the given keys.
 */
export function pickNamedRecord(
  source: unknown,
  keys: readonly string[]
): Record<string, unknown> | null {
  if (source == null || typeof source !== "object" || Array.isArray(source)) {
    return null
  }
  const record = source as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  }
  return null
}

function resolveAttributeLevel(value: unknown, depth: number): string | null {
  if (depth > 3) return null

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = resolveAttributeLevel(item, depth + 1)
      if (text != null) return text
    }
    return null
  }

  if (value != null && typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of NESTED_LEVEL_KEYS) {
      if (!(key in record)) continue
      const text = resolveAttributeLevel(record[key], depth + 1)
      if (text != null) return text
    }
    return null
  }

  if (typeof value !== "string" || isBooleanLikeLevel(value)) return null
  const text = value.trim()
  return text === "" || text === "—" ? null : text
}

/**
 * Human-readable evidence for an attribute. Presence flags like `true` are not levels.
 */
export function toAttributeLevel(value: unknown): string | null {
  return resolveAttributeLevel(value, 0)
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
    const level = toAttributeLevel(value)
    if (level == null) continue
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
      level: toAttributeLevel(value),
      score: null,
    })
  }

  return [...rowsByCanonical.values()]
}
