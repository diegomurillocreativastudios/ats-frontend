export type VacancySalaryPeriod = "monthly" | "hourly" | "yearly"

export interface VacancySalaryDisplay {
  kind: "empty" | "amount" | "text"
  primary: string
  period: VacancySalaryPeriod | null
}

const RANGE_SPLIT = /\s*[-–—]\s*/
const NUMBER_TOKEN = /\d[\d.,]*/g

function parseNumericToken(token: string): number | null {
  const trimmed = token.trim()
  if (trimmed === "") return null

  const hasComma = trimmed.includes(",")
  const hasDot = trimmed.includes(".")
  let normalized = trimmed

  if (hasComma && hasDot) {
    if (trimmed.lastIndexOf(",") > trimmed.lastIndexOf(".")) {
      normalized = trimmed.replace(/\./g, "").replace(",", ".")
    } else {
      normalized = trimmed.replace(/,/g, "")
    }
  } else if (hasComma) {
    const parts = trimmed.split(",")
    if (parts.length === 2 && parts[1]?.length === 3) {
      normalized = trimmed.replace(/,/g, "")
    } else {
      normalized = trimmed.replace(",", ".")
    }
  } else if (hasDot) {
    const parts = trimmed.split(".")
    if (parts.length === 2 && parts[1]?.length === 3) {
      normalized = trimmed.replace(/\./g, "")
    }
  }

  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

function readAmounts(text: string): number[] {
  const tokens = text.match(NUMBER_TOKEN) ?? []
  return tokens
    .map(parseNumericToken)
    .filter((amount): amount is number => amount != null)
}

function readPeriod(text: string): VacancySalaryPeriod | null {
  if (/(mensual|monthly|por mes|al mes|\/\s*mes)\b/i.test(text)) return "monthly"
  if (/(hora|hourly|por hora|\/\s*h\b)/i.test(text)) return "hourly"
  if (/(anual|yearly|por año|al año|\/\s*año|per year)\b/i.test(text)) return "yearly"
  return null
}

function formatUsd(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats recruiter vacancy salary text as a currency amount, range, or prose.
 */
export function formatVacancySalary(
  value: unknown,
  locale = "es"
): VacancySalaryDisplay {
  if (value == null) return { kind: "empty", primary: "", period: null }
  const text = String(value).trim()
  if (text === "") return { kind: "empty", primary: "", period: null }

  const amounts = readAmounts(text)
  const period = readPeriod(text)

  if (amounts.length === 0) {
    return { kind: "text", primary: text, period }
  }

  if (amounts.length === 1) {
    return { kind: "amount", primary: formatUsd(amounts[0], locale), period }
  }

  const looksLikeRange = RANGE_SPLIT.test(text)
  if (looksLikeRange || amounts.length >= 2) {
    return {
      kind: "amount",
      primary: `${formatUsd(amounts[0], locale)} – ${formatUsd(amounts[1], locale)}`,
      period,
    }
  }

  return { kind: "text", primary: text, period }
}
