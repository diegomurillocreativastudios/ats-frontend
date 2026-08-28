import { formatCountryCodeLabel } from "@/lib/profile-form-options"
import { normalizeCountryCode } from "@/lib/vacancies/vacancy-location"

export interface OpportunitySearchableVacancy {
  title: string
  company: { name?: string | null }
}

export interface OpportunityCountryOption {
  code: string
  label: string
}

export interface OpportunityResultsRange {
  from: number
  to: number
  total: number
}

/**
 * Normaliza el texto de búsqueda y comprueba título o empresa.
 */
export function vacancyMatchesSearch(
  vacancy: OpportunitySearchableVacancy,
  query: string
): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const title = vacancy.title.trim().toLowerCase()
  const company = vacancy.company.name?.trim().toLowerCase() ?? ""

  return title.includes(normalizedQuery) || company.includes(normalizedQuery)
}

/**
 * Calcula el rango visible de una página. `from` y `to` son 1-based.
 */
export function getOpportunityResultsRange(
  page: number,
  pageSize: number,
  totalCount: number
): OpportunityResultsRange {
  if (totalCount <= 0 || pageSize <= 0 || page <= 0) {
    return { from: 0, to: 0, total: Math.max(0, totalCount) }
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return { from, to, total: totalCount }
}

function toCountryOption(
  code: string | null | undefined,
  label?: string | null
): OpportunityCountryOption | null {
  const normalizedCode = normalizeCountryCode(code)
  if (!normalizedCode) return null

  const normalizedLabel = label?.trim()
  return {
    code: normalizedCode,
    label: normalizedLabel || formatCountryCodeLabel(normalizedCode),
  }
}

/**
 * Une países ya vistos, los de la página actual y el filtro seleccionado
 * para que el select no se quede con una sola opción al filtrar.
 */
export function mergeCountryFilterOptions(
  current: OpportunityCountryOption[],
  items: Array<{ countryCode?: string | null; countryLabel?: string | null }>,
  selected?: { code?: string | null; label?: string | null }
): OpportunityCountryOption[] {
  const options = new Map<string, OpportunityCountryOption>()

  for (const option of current) {
    const next = toCountryOption(option.code, option.label)
    if (next) options.set(next.code, next)
  }

  for (const item of items) {
    const next = toCountryOption(item.countryCode, item.countryLabel)
    if (next && !options.has(next.code)) options.set(next.code, next)
  }

  const selectedOption = toCountryOption(selected?.code, selected?.label)
  if (selectedOption && !options.has(selectedOption.code)) {
    options.set(selectedOption.code, selectedOption)
  }

  return [...options.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "es")
  )
}
