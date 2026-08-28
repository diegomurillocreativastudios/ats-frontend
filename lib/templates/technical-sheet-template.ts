import { apiClient } from "@/lib/api"
import {
  QUERY_FETCH_ALL_PAGE_SIZE,
  fetchAllHeaderPagedList,
} from "@/lib/api/query-paging"

/** Normalized row for template list operations (subset of admin plantillas fields). */
export interface TemplateListItem {
  id: string | number
  type: string
  name: string
  slug?: string
  contentTemplate: string
  outputFormat?: string
  isTechnicalSheet: boolean
  isReport: boolean
}

/**
 * Unwraps common API envelopes for GET /api/Templates (same as portal-admin plantillas).
 */
export function unwrapTemplatesResponse(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data != null && typeof data === "object") {
    const root = data as Record<string, unknown>
    const nested = root.templates ?? root.items ?? root.data
    if (Array.isArray(nested)) return nested
  }
  return []
}

/** Unwraps a single template payload from GET /api/Templates/{id}. */
export function unwrapTemplateItem(data: unknown): unknown {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return data
  const root = data as Record<string, unknown>
  const nested = root.template ?? root.data
  if (nested != null && typeof nested === "object" && !Array.isArray(nested)) return nested
  if ("id" in root || "name" in root || "type" in root) return data
  return data
}

export function mapTemplateListItem(item: unknown, index = 0): TemplateListItem {
  if (item == null || typeof item !== "object") {
    return {
      id: index,
      type: "",
      name: "",
      contentTemplate: "",
      isTechnicalSheet: false,
      isReport: false,
    }
  }
  const o = item as Record<string, unknown>
  const id = o.id ?? o.uuid ?? index
  const slugRaw = o.slug
  const outputFormatRaw = o.outputFormat
  return {
    id: id as string | number,
    type: String(o.type ?? "Notification"),
    name: String(o.name ?? ""),
    slug: slugRaw != null && String(slugRaw).trim() !== "" ? String(slugRaw) : undefined,
    contentTemplate: String(o.contentTemplate ?? ""),
    outputFormat:
      outputFormatRaw != null && String(outputFormatRaw).trim() !== ""
        ? String(outputFormatRaw)
        : undefined,
    isTechnicalSheet: Boolean(o.isTechnicalSheet),
    isReport: Boolean(o.isReport),
  }
}

/**
 * Maps the raw API list to normalized rows.
 */
export function mapTemplatesList(items: readonly unknown[]): TemplateListItem[] {
  return items.map((row, i) => mapTemplateListItem(row, i))
}

export function normalizeTemplateType(type: string): string {
  return String(type ?? "").trim().toLowerCase()
}

function sortKeyId(id: string | number): string {
  if (typeof id === "number" && Number.isFinite(id)) return id.toString().padStart(20, "0")
  return String(id)
}

/** True when the row is a Document template flagged as report. */
export function isReportDocumentTemplate(t: TemplateListItem): boolean {
  return normalizeTemplateType(t.type) === "document" && t.isReport
}

function pickPreferredDocumentTemplate(
  items: readonly TemplateListItem[],
  matches: (t: TemplateListItem) => boolean,
  nameKeyword: string
): TemplateListItem | null {
  const candidates = items.filter(
    (t) => normalizeTemplateType(t.type) === "document" && matches(t)
  )
  if (candidates.length === 0) return null

  const keyword = nameKeyword.trim().toLowerCase()
  const withScore = candidates.map((t) => {
    const nameLower = t.name.trim().toLowerCase()
    const prefersKeyword = keyword.length > 0 && nameLower.includes(keyword) ? 1 : 0
    return { t, prefersKeyword }
  })

  withScore.sort((a, b) => {
    if (b.prefersKeyword !== a.prefersKeyword) return b.prefersKeyword - a.prefersKeyword
    const idCmp = sortKeyId(a.t.id).localeCompare(sortKeyId(b.t.id))
    if (idCmp !== 0) return idCmp
    return a.t.name.localeCompare(b.t.name, "es")
  })

  return withScore[0]?.t ?? null
}

/**
 * Picks the technical-sheet document template when several exist:
 * 1. Prefer name containing "ficha" (case-insensitive).
 * 2. Then stable order by id, then name.
 */
export function findTechnicalSheetDocumentTemplate(
  items: readonly TemplateListItem[]
): TemplateListItem | null {
  return pickPreferredDocumentTemplate(items, (t) => t.isTechnicalSheet, "ficha")
}

/** Document templates flagged as report layouts (`isReport`). */
export function filterReportDocumentTemplates(
  items: readonly TemplateListItem[]
): TemplateListItem[] {
  return items.filter(isReportDocumentTemplate)
}

/** Stable sort for report document templates (name, then id). */
export function sortReportDocumentTemplates(
  items: readonly TemplateListItem[]
): TemplateListItem[] {
  return [...items].sort((a, b) => {
    const nameCmp = a.name.localeCompare(b.name, "es")
    if (nameCmp !== 0) return nameCmp
    return sortKeyId(a.id).localeCompare(sortKeyId(b.id))
  })
}

/**
 * Finds a report document template by id with strict validation.
 */
export function findReportDocumentTemplateById(
  items: readonly TemplateListItem[],
  id: string | number
): TemplateListItem | null {
  const target = String(id)
  const match = items.find((t) => String(t.id) === target)
  if (!match || !isReportDocumentTemplate(match)) return null
  return match
}

/**
 * Picks the report document template when several exist:
 * 1. Prefer name containing "reporte" (case-insensitive).
 * 2. Then stable order by id, then name.
 */
export function findReportDocumentTemplate(
  items: readonly TemplateListItem[]
): TemplateListItem | null {
  return pickPreferredDocumentTemplate(items, (t) => t.isReport, "reporte")
}

/**
 * Loads a single template by id. Prefers GET /api/Templates/{id}; on failure,
 * falls back to the document list + findReportDocumentTemplateById.
 */
export async function fetchTemplateById(id: string | number): Promise<TemplateListItem | null> {
  const idStr = String(id).trim()
  if (!idStr) return null

  try {
    const data = await apiClient.get(`/api/Templates/${encodeURIComponent(idStr)}`)
    const mapped = mapTemplateListItem(unwrapTemplateItem(data), 0)
    return isReportDocumentTemplate(mapped) ? mapped : null
  } catch {
    const list = await fetchTemplatesList({ documentOnly: true })
    return findReportDocumentTemplateById(list, id)
  }
}

/**
 * Loads templates from the backend. Pass `documentOnly` to use GET ?type=Document.
 */
export async function fetchTemplatesList(options?: {
  documentOnly?: boolean
}): Promise<TemplateListItem[]> {
  const path = options?.documentOnly
    ? "/api/Templates?type=Document"
    : "/api/Templates"
  const list = await fetchAllHeaderPagedList(path, QUERY_FETCH_ALL_PAGE_SIZE)
  return mapTemplatesList(list)
}
