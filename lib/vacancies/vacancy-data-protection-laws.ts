export interface VacancyDataProtectionLaw {
  id: string
  code: string
  displayName: string
  jurisdictionCode: string
  officialReference: string
  summary: string
  locale: string
  body: string
  isActive: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

function readString(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value
  if (value === "true" || value === 1) return true
  if (value === "false" || value === 0) return false
  return fallback
}

export function mapVacancyDataProtectionLaw(raw: unknown): VacancyDataProtectionLaw | null {
  if (!isRecord(raw)) return null
  const id = readString(raw.id)
  if (id === "") return null

  return {
    id,
    code: readString(raw.code),
    displayName: readString(raw.displayName ?? raw.display_name ?? raw.name),
    jurisdictionCode: readString(
      raw.jurisdictionCode ?? raw.jurisdiction_code,
    ).toUpperCase(),
    officialReference: readString(raw.officialReference ?? raw.official_reference),
    summary: readString(raw.summary),
    locale: readString(raw.locale),
    body: typeof raw.body === "string" ? raw.body : "",
    isActive: readBoolean(raw.isActive ?? raw.is_active, true),
  }
}

function readLawArray(record: Record<string, unknown>): unknown[] | null {
  const raw = record.dataProtectionLaws ?? record.data_protection_laws
  return Array.isArray(raw) ? raw : null
}

/** Laws embedded on a recruiter vacancy. Missing keys yield an empty list. */
export function readVacancyDataProtectionLaws(vacancy: unknown): VacancyDataProtectionLaw[] {
  if (!isRecord(vacancy)) return []
  const raw = readLawArray(vacancy)
  if (!raw) return []

  const laws: VacancyDataProtectionLaw[] = []
  for (const item of raw) {
    const law = mapVacancyDataProtectionLaw(item)
    if (law) laws.push(law)
  }
  return laws
}

export function readVacancyDataProtectionLawIds(vacancy: unknown): string[] {
  if (!isRecord(vacancy)) return []

  const fromLaws = readVacancyDataProtectionLaws(vacancy).map((law) => law.id)
  if (fromLaws.length > 0) return fromLaws

  const rawIds = vacancy.dataProtectionLawIds ?? vacancy.data_protection_law_ids
  if (!Array.isArray(rawIds)) return []

  const ids: string[] = []
  for (const id of rawIds) {
    const trimmed = readString(id)
    if (trimmed !== "") ids.push(trimmed)
  }
  return ids
}

/** Active picker laws plus inactive laws already linked to the vacancy. */
export function mergeLinkedLawOptions(
  active: readonly VacancyDataProtectionLaw[],
  linked: readonly VacancyDataProtectionLaw[],
): VacancyDataProtectionLaw[] {
  const byId = new Map<string, VacancyDataProtectionLaw>()
  for (const law of active) {
    if (law.id.trim() !== "") byId.set(law.id, law)
  }
  for (const law of linked) {
    if (law.id.trim() !== "" && !byId.has(law.id)) byId.set(law.id, law)
  }
  return [...byId.values()]
}
