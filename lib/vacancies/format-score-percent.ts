/**
 * Formats an API match score (usually 0–1) as a recruiter-facing percent.
 */
export function formatScorePercent(
  value: unknown,
  options?: { forceOneDecimal?: boolean }
): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null

  const percent = value * 100
  if (options?.forceOneDecimal) return `${percent.toFixed(1)}%`

  const roundedTenth = Math.round(percent * 10) / 10
  if (Number.isInteger(roundedTenth)) return `${Math.round(percent)}%`

  return `${percent.toFixed(1)}%`
}

/**
 * Width for a score bar, clamped to 0–100.
 */
export function scoreBarWidth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.min(Math.max(value * 100, 0), 100)
}
