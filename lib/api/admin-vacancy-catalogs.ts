import { apiClient } from "@/lib/api"

export type VacancyCatalogKind = "departments" | "modalities"

export interface VacancyCatalogAdminItem {
  id: string
  code: string
  displayName: string
  description?: string
  sortOrder: number
  isActive: boolean
  vacanciesCount?: number
}

export interface VacancyCatalogFormValues {
  displayName: string
  code: string
  description?: string
  sortOrder: number
  isActive: boolean
}

function getCatalogBasePath(kind: VacancyCatalogKind): string {
  return kind === "departments"
    ? "/api/admin/vacancy-departments"
    : "/api/admin/vacancy-modalities"
}

function toStringValue(value: unknown): string {
  if (value == null) return ""
  return String(value)
}

function toOptionalStringValue(value: unknown): string | undefined {
  const normalized = toStringValue(value).trim()
  return normalized === "" ? undefined : normalized
}

function toNumberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeVacanciesCount(raw: Record<string, unknown>): number | undefined {
  const count = raw.vacanciesCount ?? raw.vacancies_count ?? raw.relatedVacanciesCount
  if (count == null || count === "") return undefined
  const parsed = Number(count)
  return Number.isFinite(parsed) ? parsed : undefined
}

function mapCatalogItem(raw: unknown): VacancyCatalogAdminItem {
  const item = raw as Record<string, unknown>

  return {
    id: toStringValue(item.id ?? item.uuid),
    code: toStringValue(item.code),
    displayName: toStringValue(item.displayName ?? item.display_name ?? item.name),
    description: toOptionalStringValue(item.description),
    sortOrder: toNumberValue(item.sortOrder ?? item.sort_order ?? item.order, 0),
    isActive: Boolean(item.isActive ?? item.is_active ?? true),
    vacanciesCount: normalizeVacanciesCount(item),
  }
}

function normalizeListPayload(payload: unknown): VacancyCatalogAdminItem[] {
  if (Array.isArray(payload)) {
    return payload.map(mapCatalogItem)
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    const items =
      record.items ??
      record.data ??
      record.departments ??
      record.modalities ??
      record.results

    if (Array.isArray(items)) {
      return items.map(mapCatalogItem)
    }
  }

  return []
}

export function sortVacancyCatalogItems(
  items: VacancyCatalogAdminItem[]
): VacancyCatalogAdminItem[] {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    return left.displayName.localeCompare(right.displayName, "es", {
      sensitivity: "base",
    })
  })
}

export async function listAdminVacancyCatalog(
  kind: VacancyCatalogKind
): Promise<VacancyCatalogAdminItem[]> {
  const data = await apiClient.get(getCatalogBasePath(kind))
  return sortVacancyCatalogItems(normalizeListPayload(data))
}

export async function getAdminVacancyCatalogItem(
  kind: VacancyCatalogKind,
  id: string
): Promise<VacancyCatalogAdminItem> {
  const data = await apiClient.get(
    `${getCatalogBasePath(kind)}/${encodeURIComponent(id)}`
  )
  return mapCatalogItem(data)
}

export async function createAdminVacancyCatalogItem(
  kind: VacancyCatalogKind,
  payload: VacancyCatalogFormValues
): Promise<VacancyCatalogAdminItem> {
  const data = await apiClient.post(getCatalogBasePath(kind), payload)
  return mapCatalogItem(data)
}

export async function updateAdminVacancyCatalogItem(
  kind: VacancyCatalogKind,
  id: string,
  payload: VacancyCatalogFormValues
): Promise<VacancyCatalogAdminItem> {
  const data = await apiClient.put(
    `${getCatalogBasePath(kind)}/${encodeURIComponent(id)}`,
    payload
  )
  return mapCatalogItem(data)
}

export async function deleteAdminVacancyCatalogItem(
  kind: VacancyCatalogKind,
  id: string
): Promise<void> {
  await apiClient.delete(`${getCatalogBasePath(kind)}/${encodeURIComponent(id)}`)
}
