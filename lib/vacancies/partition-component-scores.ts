import { formatRequirementKey } from "@/lib/vacancies/format-requirement-key"

export const SCORE_KEYS_AGGREGATE = [
  "attribute_aggregate",
  "AttributeAggregate",
  "attributeAggregate",
] as const

export const SCORE_KEYS_QUALITATIVE = [
  "QualitativeScore",
  "qualitativeScore",
  "qualitative_score",
] as const

export const SCORE_KEYS_SEMANTIC = [
  "VectorSimilarity",
  "vectorSimilarity",
  "vector_similarity",
  "SemanticScore",
  "semanticScore",
  "semantic_score",
] as const

export type ScoreEntry = [string, unknown]

export interface PartitionedComponentScores {
  attributeIndividuals: ScoreEntry[]
  aggregateEntry: ScoreEntry | null
  qualitativeEntry: ScoreEntry | null
  semanticEntry: ScoreEntry | null
}

const RESERVED_SCORE_KEYS = new Set<string>([
  ...SCORE_KEYS_AGGREGATE,
  ...SCORE_KEYS_QUALITATIVE,
  ...SCORE_KEYS_SEMANTIC,
])

function findScoreEntry(
  entries: ScoreEntry[],
  keyList: readonly string[]
): ScoreEntry | null {
  for (const key of keyList) {
    const found = entries.find(([entryKey]) => entryKey === key)
    if (found) return found
  }
  return null
}

function toSortableScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

/**
 * Splits componentScores into attribute rows vs reserved aggregates.
 */
export function partitionComponentScores(
  entries: ScoreEntry[]
): PartitionedComponentScores {
  const attributeIndividuals = entries
    .filter(([key]) => !RESERVED_SCORE_KEYS.has(key))
    .sort(([left], [right]) => String(left).localeCompare(String(right)))

  return {
    attributeIndividuals,
    aggregateEntry: findScoreEntry(entries, SCORE_KEYS_AGGREGATE),
    qualitativeEntry: findScoreEntry(entries, SCORE_KEYS_QUALITATIVE),
    semanticEntry: findScoreEntry(entries, SCORE_KEYS_SEMANTIC),
  }
}

/**
 * Puts the weakest attribute scores first so gaps are visible.
 */
export function sortScoresByAscendingValue(entries: ScoreEntry[]): ScoreEntry[] {
  return [...entries].sort((left, right) => {
    const scoreDelta = toSortableScore(left[1]) - toSortableScore(right[1])
    if (scoreDelta !== 0) return scoreDelta
    return String(left[0]).localeCompare(String(right[0]))
  })
}

/**
 * True when some attribute rows are 0 but the combined score is full.
 */
export function hasZeroScoreOutsideFullAggregate(
  attributeIndividuals: ScoreEntry[],
  aggregateEntry: ScoreEntry | null
): boolean {
  const aggregateValue = aggregateEntry?.[1]
  const isAggregateFull =
    typeof aggregateValue === "number" &&
    Number.isFinite(aggregateValue) &&
    aggregateValue >= 0.995

  if (!isAggregateFull) return false

  return attributeIndividuals.some(
    ([, value]) => typeof value === "number" && Number.isFinite(value) && value === 0
  )
}

/**
 * Maps a raw score key to a recruiter-facing label.
 */
export function formatScoreKey(
  key: unknown,
  knownLabels: Record<string, string> = {}
): string {
  const raw = String(key ?? "").trim()
  if (raw === "") return ""
  if (knownLabels[raw]) return knownLabels[raw]
  return formatRequirementKey(raw)
}
