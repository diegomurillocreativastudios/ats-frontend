import {
  formatVacancyCountryLabel,
  resolveVacancyStateDisplayName,
} from "@/lib/vacancies/vacancy-location-display"

export interface VacancyLocationSelection {
  countryCode: string
  stateCode: string
}

export function normalizeCountryCode(raw: unknown): string | null {
  if (raw == null) return null
  const normalized = String(raw).trim().toUpperCase()
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) return null
  return normalized
}

export function normalizeStateCode(raw: unknown): string | null {
  if (raw == null) return null
  const normalized = String(raw).trim().toUpperCase()
  if (!normalized) return null
  return normalized
}

export function readVacancyStateCode(record: Record<string, unknown> | null | undefined): string | null {
  if (!record) return null
  return normalizeStateCode(record.stateCode ?? record.state_code)
}

export function formatVacancyLocationLabel(input: {
  countryCode?: string | null
  stateCode?: string | null
  countryLabel?: string | null
  stateName?: string | null
  emptyLabel?: string
}): string {
  const emptyLabel = input.emptyLabel ?? "Sin especificar"
  const countryLabel = input.countryLabel?.trim() ?? ""
  const stateName = input.stateName?.trim() ?? ""
  const countryCode = normalizeCountryCode(input.countryCode)
  const stateCode = normalizeStateCode(input.stateCode)

  if (stateName && countryLabel) return `${countryLabel}, ${stateName}`
  if (stateName && countryCode) return `${countryCode}, ${stateName}`
  if (stateName) return stateName
  if (countryLabel) return countryLabel
  if (countryCode) return countryCode
  return emptyLabel
}

export async function resolveVacancyStateName(
  countryCode: string | null | undefined,
  stateCode: string | null | undefined
): Promise<string | null> {
  return resolveVacancyStateDisplayName(countryCode, stateCode)
}

export async function buildVacancyLocationLabel(input: {
  countryCode?: string | null
  stateCode?: string | null
  countryLabel?: string | null
  emptyLabel?: string
}): Promise<string> {
  const countryCode = normalizeCountryCode(input.countryCode)
  const stateCode = normalizeStateCode(input.stateCode)
  const countryLabel =
    input.countryLabel ?? (countryCode ? formatVacancyCountryLabel(countryCode) : "")
  const stateName =
    countryCode && stateCode
      ? await resolveVacancyStateName(countryCode, stateCode)
      : null

  return formatVacancyLocationLabel({
    countryCode,
    stateCode,
    countryLabel,
    stateName,
    emptyLabel: input.emptyLabel,
  })
}

export { formatVacancyCountryLabel, formatVacancyStateLabel } from "@/lib/vacancies/vacancy-location-display"

export function appendVacancyLocationToPayload(
  payload: Record<string, unknown>,
  selection: VacancyLocationSelection
): void {
  const countryCode = normalizeCountryCode(selection.countryCode)
  const stateCode = normalizeStateCode(selection.stateCode)

  if (countryCode) {
    payload.countryCode = countryCode
    payload.stateCode = stateCode ?? null
    return
  }

  payload.countryCode = ""
  payload.stateCode = null
}
