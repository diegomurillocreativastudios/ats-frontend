import { apiClient } from "@/lib/api"

/** Normalized row for template list operations (subset of admin plantillas fields). */
export interface TemplateListItem {
  id: string | number
  type: string
  name: string
  contentTemplate: string
  isTechnicalSheet: boolean
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

/**
 * Picks the technical-sheet document template when several exist:
 * 1. Prefer name containing "ficha" (case-insensitive).
 * 2. Then stable order by id, then name.
 */
export function findTechnicalSheetDocumentTemplate(
  items: readonly TemplateListItem[]
): TemplateListItem | null {
  const candidates = items.filter(
    (t) => normalizeTemplateType(t.type) === "document" && t.isTechnicalSheet
  )
  if (candidates.length === 0) return null

  const withScore = candidates.map((t) => {
    const nameLower = t.name.trim().toLowerCase()
    const prefersFicha = nameLower.includes("ficha") ? 1 : 0
    return { t, prefersFicha }
  })

  withScore.sort((a, b) => {
    if (b.prefersFicha !== a.prefersFicha) return b.prefersFicha - a.prefersFicha
    const idCmp = sortKeyId(a.t.id).localeCompare(sortKeyId(b.t.id))
    if (idCmp !== 0) return idCmp
    return a.t.name.localeCompare(b.t.name, "es")
  })

  return withScore[0]?.t ?? null
}

/**
 * Loads all templates from the backend (recruiter/admin contract).
 */
export async function fetchTemplatesList(): Promise<TemplateListItem[]> {
  const data = await apiClient.get("/api/Templates")
  return mapTemplatesList(unwrapTemplatesResponse(data))
}
