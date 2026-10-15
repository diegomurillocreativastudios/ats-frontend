import { formatRequirementKey } from "@/lib/vacancies/format-requirement-key"
import type { ScoreEntry } from "@/lib/vacancies/partition-component-scores"

export type RequirementVerdict = "Met" | "Partial" | "NotMet" | "Unavailable"

export interface RequirementAssessmentView {
  key: string
  verdict: RequirementVerdict
  score: number | null
  evidence: string | null
  candidateValue: string | null
}

export interface AttributeTableRow {
  key: string
  label: string
  level: string | null
  score: unknown
  verdict?: RequirementVerdict
}

const REQUIREMENT_VERDICTS: readonly RequirementVerdict[] = ["Met", "Partial", "NotMet", "Unavailable"]

export const REQUIREMENT_ASSESSMENT_RECORD_KEYS = [
  "requirementAssessments",
  "RequirementAssessments",
  "requirement_assessments",
] as const

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

function readField(record: Record<string, unknown>, camelKey: string): unknown {
  const pascalKey = camelKey.charAt(0).toUpperCase() + camelKey.slice(1)
  return record[camelKey] ?? record[pascalKey]
}

function toOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  return text === "" ? null : text
}

/**
 * Per-requirement verdicts from the requirements engine; empty for legacy matches.
 */
export function pickRequirementAssessments(source: unknown): RequirementAssessmentView[] {
  if (source == null || typeof source !== "object" || Array.isArray(source)) return []
  const record = source as Record<string, unknown>
  const raw = REQUIREMENT_ASSESSMENT_RECORD_KEYS.map((key) => record[key]).find(Array.isArray)
  if (!Array.isArray(raw)) return []

  return raw.flatMap((item): RequirementAssessmentView[] => {
    if (item == null || typeof item !== "object" || Array.isArray(item)) return []
    const entry = item as Record<string, unknown>
    const key = toOptionalText(readField(entry, "key"))
    const verdict = readField(entry, "verdict")
    if (key == null || !REQUIREMENT_VERDICTS.includes(verdict as RequirementVerdict)) return []
    const score = readField(entry, "score")
    return [
      {
        key,
        verdict: verdict as RequirementVerdict,
        score: typeof score === "number" && Number.isFinite(score) ? score : null,
        evidence: toOptionalText(readField(entry, "evidence")),
        candidateValue: toOptionalText(readField(entry, "candidateValue")),
      },
    ]
  })
}

export function buildAttributeRowsFromAssessments(
  assessments: RequirementAssessmentView[],
  getScoreLabel: (key: string) => string
): AttributeTableRow[] {
  return assessments.map((assessment) => ({
    key: assessment.key,
    label: getScoreLabel(assessment.key),
    level: assessment.evidence ?? assessment.candidateValue,
    score: assessment.verdict === "Unavailable" ? null : assessment.score,
    verdict: assessment.verdict,
  }))
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
