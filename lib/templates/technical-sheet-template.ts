import { apiClient } from "@/lib/api"

/** Normalized row for template list operations (subset of admin plantillas fields). */
export interface TemplateListItem {
  id: string | number
  type: string
  name: string
  contentTemplate: string
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

function mapTemplateListItem(item: unknown, index: number): TemplateListItem {
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
  return {
    id: id as string | number,
    type: String(o.type ?? "Notification"),
    name: String(o.name ?? ""),
    contentTemplate: String(o.contentTemplate ?? ""),
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

function normalizeTemplateType(type: string): string {
  return String(type ?? "").trim().toLowerCase()
}

function sortKeyId(id: string | number): string {
  if (typeof id === "number" && Number.isFinite(id)) return id.toString().padStart(20, "0")
  return String(id)
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
  return items.filter(
    (t) => normalizeTemplateType(t.type) === "document" && t.isReport
  )
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
 * Loads templates from the backend. Pass `documentOnly` to use GET ?type=Document.
 */
export async function fetchTemplatesList(options?: {
  documentOnly?: boolean
}): Promise<TemplateListItem[]> {
  const path = options?.documentOnly
    ? "/api/Templates?type=Document"
    : "/api/Templates"
  const data = await apiClient.get(path)
  return mapTemplatesList(unwrapTemplatesResponse(data))
}
