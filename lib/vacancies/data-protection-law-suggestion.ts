/** ISO 3166-1 alpha-2 codes of the 27 European Union member states. */
export const EU_COUNTRY_CODES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
] as const

const EU_COUNTRY_CODE_SET = new Set<string>(EU_COUNTRY_CODES)

export interface DataProtectionLawSuggestionSource {
  id: string
  jurisdictionCode: string
  isActive: boolean
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase()
}

/**
 * Suggests active laws for a vacancy country.
 * El Salvador maps to jurisdiction SV. European Union members map to EU.
 * Any other country returns no suggestion. Inactive laws are ignored.
 */
export function suggestDataProtectionLawIds(
  countryCode: string,
  laws: readonly DataProtectionLawSuggestionSource[],
): string[] {
  const country = normalizeCode(countryCode)
  if (country === "") return []

  let jurisdiction = ""
  if (country === "SV") jurisdiction = "SV"
  else if (EU_COUNTRY_CODE_SET.has(country)) jurisdiction = "EU"
  if (jurisdiction === "") return []

  const seen = new Set<string>()
  const ids: string[] = []
  for (const law of laws) {
    if (!law.isActive) continue
    if (normalizeCode(law.jurisdictionCode) !== jurisdiction) continue
    const id = law.id.trim()
    if (id === "" || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/** Drops blanks and repeated identifiers, keeping the first occurrence. A missing list is empty. */
export function normalizeDataProtectionLawIds(
  ids: readonly string[] | null | undefined,
): string[] {
  if (!Array.isArray(ids)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    if (typeof id !== "string") continue
    const trimmed = id.trim()
    if (trimmed === "" || seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
  }
  return result
}

export function sameDataProtectionLawIds(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const a = normalizeDataProtectionLawIds(left)
  const b = normalizeDataProtectionLawIds(right)
  if (a.length !== b.length) return false
  const rightSet = new Set(b)
  return a.every((id) => rightSet.has(id))
}
