/**
 * Formats salary expectation for technical-sheet bindings (preview + PDF).
 * Output example: `$2,500 USD`.
 */
export function formatTechnicalSheetSalaryExpectation(value: unknown): string {
  if (value == null || value === "") return ""

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return ""
    return formatUsdAmount(value)
  }

  const raw = String(value).trim()
  if (!raw) return ""

  const normalized = raw.replace(/,/g, "")
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  if (!match) return raw

  const n = Number(match[0])
  if (!Number.isFinite(n)) return raw
  return formatUsdAmount(n)
}

function formatUsdAmount(amount: number): string {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)
  return `$${formatted} USD`
}
