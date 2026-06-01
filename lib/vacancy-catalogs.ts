import type { VacancyCatalogAdminItem } from "@/lib/api/admin-vacancy-catalogs"

export interface VacancyCatalogSummary {
  id: string
  code: string
  displayName: string
}

export interface VacancyCatalogSelectOption extends VacancyCatalogSummary {}

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isGuid(value: string): boolean {
  return GUID_PATTERN.test(value)
}

function toOptionalString(value: unknown): string | null {
  if (value == null) return null
  const normalized = String(value).trim()
  return normalized === "" ? null : normalized
}

function toGuidOrNull(value: unknown): string | null {
  const normalized = toOptionalString(value)
  if (!normalized) return null
  return isGuid(normalized) ? normalized : null
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function normalizeSummary(raw: unknown): VacancyCatalogSummary | null {
  const record = getRecord(raw)
  if (!record) return null

  const id = toOptionalString(record.id ?? record.uuid)
  const code = toOptionalString(record.code)
  const displayName = toOptionalString(
    record.displayName ?? record.display_name ?? record.name ?? record.label
  )

  if (!displayName) return null

  return {
    id: id ?? displayName,
    code: code ?? displayName,
    displayName,
  }
}

function getNestedSummary(
  item: Record<string, unknown> | null | undefined,
  keys: string[]
): VacancyCatalogSummary | null {
  if (!item) return null

  for (const key of keys) {
    const summary = normalizeSummary(item[key])
    if (summary) return summary
  }

  return null
}

function getFirstString(
  item: Record<string, unknown> | null | undefined,
  keys: string[]
): string | null {
  if (!item) return null

  for (const key of keys) {
    const raw = item[key]
    if (raw != null && typeof raw === "object") continue

    const value = toOptionalString(raw)
    if (value) return value
  }

  return null
}

export function getVacancyDepartmentSummary(
  vacancy: Record<string, unknown> | null | undefined
): VacancyCatalogSummary | null {
  const nested = getNestedSummary(vacancy, [
    "vacancyDepartment",
    "vacancy_department",
    "department",
    "departmentSummary",
  ])
  if (nested) return nested

  const displayName = getFirstString(vacancy, [
    "department",
    "department_name",
    "jobCategory",
    "job_category",
  ])

  if (!displayName) return null

  const id = getFirstString(vacancy, [
    "vacancyDepartmentId",
    "vacancy_department_id",
  ])

  return {
    id: id ?? displayName,
    code: displayName,
    displayName,
  }
}

export function getVacancyModalitySummary(
  vacancy: Record<string, unknown> | null | undefined
): VacancyCatalogSummary | null {
  const nested = getNestedSummary(vacancy, [
    "vacancyModality",
    "vacancy_modality",
    "modality",
    "workArrangement",
    "work_arrangement",
  ])
  if (nested) return nested

  const displayName = getFirstString(vacancy, [
    "modality",
    "modality_name",
    "workArrangement",
    "work_arrangement",
  ])

  if (!displayName) return null

  const id = getFirstString(vacancy, [
    "vacancyModalityId",
    "vacancy_modality_id",
  ])

  return {
    id: id ?? displayName,
    code: displayName,
    displayName,
  }
}

/**
 * Returns the department GUID to use as form state or as payload value.
 * Only returns valid GUID strings — never falls back to legacy display strings.
 * This prevents accidentally sending a free-text string like "Uncategorized"
 * to the backend, which expects a GUID or null.
 */
export function getVacancyDepartmentId(
  vacancy: Record<string, unknown> | null | undefined
): string {
  if (!vacancy) return ""

  const directGuid = toGuidOrNull(
    vacancy.vacancyDepartmentId ?? vacancy.vacancy_department_id
  )
  if (directGuid) return directGuid

  const nested = getNestedSummary(vacancy, [
    "vacancyDepartment",
    "vacancy_department",
    "department",
    "departmentSummary",
  ])
  if (nested && isGuid(nested.id)) return nested.id

  return ""
}

/**
 * Returns the modality GUID to use as form state or as payload value.
 * Only returns valid GUID strings — never falls back to legacy display strings.
 */
export function getVacancyModalityId(
  vacancy: Record<string, unknown> | null | undefined
): string {
  if (!vacancy) return ""

  const directGuid = toGuidOrNull(
    vacancy.vacancyModalityId ?? vacancy.vacancy_modality_id
  )
  if (directGuid) return directGuid

  const nested = getNestedSummary(vacancy, [
    "vacancyModality",
    "vacancy_modality",
    "modality",
    "workArrangement",
    "work_arrangement",
  ])
  if (nested && isGuid(nested.id)) return nested.id

  return ""
}

export function getVacancyDepartmentLabel(
  vacancy: Record<string, unknown> | null | undefined
): string {
  return getVacancyDepartmentSummary(vacancy)?.displayName ?? "No especificado"
}

export function getVacancyModalityLabel(
  vacancy: Record<string, unknown> | null | undefined
): string {
  return getVacancyModalitySummary(vacancy)?.displayName ?? "No especificado"
}

export function mapActiveCatalogItemsToOptions(
  items: VacancyCatalogAdminItem[]
): VacancyCatalogSelectOption[] {
  return items
    .filter((item) => item.isActive)
    .map((item) => ({
      id: item.id,
      code: item.code,
      displayName: item.displayName,
    }))
}

/**
 * Merges the current vacancy's catalog summary into the options list
 * so that an inactive or missing catalog item (e.g., a deactivated department
 * that the vacancy was assigned before it was deactivated) still shows in the
 * select while editing. Only merges if the summary has a valid GUID as id.
 */
export function mergeCatalogOption(
  options: VacancyCatalogSelectOption[],
  currentSummary: VacancyCatalogSummary | null
): VacancyCatalogSelectOption[] {
  if (!currentSummary) return options
  if (!isGuid(currentSummary.id)) return options

  const alreadyIncluded = options.some((option) => option.id === currentSummary.id)
  if (alreadyIncluded) return options

  return [currentSummary, ...options]
}
