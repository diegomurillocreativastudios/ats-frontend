import { apiClient } from "@/lib/api"

const REPORTS_CATALOG_ENDPOINT = "/api/recruiter/reports/catalog"

export interface ReportCatalogLinkedTemplate {
  templateId: string
  name?: string
}

export interface ReportCatalogFilter {
  key: string
  label?: string
  type?: string
  [extra: string]: unknown
}

export interface ReportCatalogItem {
  reportKey: string
  name: string
  description?: string
  endpoint?: string
  filters?: ReportCatalogFilter[]
  linkedTemplate: ReportCatalogLinkedTemplate | null
}

function normalizeTemplateId(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "number" && !Number.isNaN(value)) return String(value)
  return String(value).trim()
}

function coerceLinkedTemplate(
  raw: unknown
): ReportCatalogLinkedTemplate | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  const templateId = normalizeTemplateId(
    rec.templateId ?? rec.TemplateId ?? rec.id ?? rec.Id
  )
  if (!templateId) return null
  const nameRaw = rec.name ?? rec.Name ?? rec.templateName ?? rec.TemplateName
  const name =
    nameRaw != null && String(nameRaw).trim() !== ""
      ? String(nameRaw).trim()
      : undefined
  return { templateId, name }
}

function coerceCatalogFilter(raw: unknown): ReportCatalogFilter | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  const key = String(rec.key ?? rec.Key ?? rec.name ?? "").trim()
  if (!key) return null

  const labelRaw = rec.label ?? rec.Label ?? rec.title
  const label =
    labelRaw != null && String(labelRaw).trim() !== ""
      ? String(labelRaw).trim()
      : undefined

  const typeRaw = rec.type ?? rec.Type ?? rec.kind
  const type =
    typeRaw != null && String(typeRaw).trim() !== ""
      ? String(typeRaw).trim()
      : undefined

  return { ...rec, key, label, type }
}

function coerceCatalogFilters(
  raw: unknown
): ReportCatalogFilter[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const parsed = raw
    .map(coerceCatalogFilter)
    .filter((f): f is ReportCatalogFilter => f != null)
  return parsed.length > 0 ? parsed : undefined
}

function coerceCatalogItem(raw: unknown): ReportCatalogItem | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  const reportKey = String(
    rec.reportKey ?? rec.ReportKey ?? rec.key ?? ""
  ).trim()
  if (!reportKey) return null

  const name = String(
    rec.name ?? rec.Name ?? rec.title ?? rec.label ?? reportKey
  ).trim()

  const descRaw = rec.description ?? rec.Description ?? rec.summary
  const description =
    descRaw != null && String(descRaw).trim() !== ""
      ? String(descRaw).trim()
      : undefined

  const endpointRaw = rec.endpoint ?? rec.Endpoint ?? rec.url
  const endpoint =
    endpointRaw != null && String(endpointRaw).trim() !== ""
      ? String(endpointRaw).trim()
      : undefined

  const filtersRaw = rec.filters ?? rec.Filters
  const filters = coerceCatalogFilters(filtersRaw)

  const linkedRaw =
    rec.linkedTemplate ??
    rec.LinkedTemplate ??
    rec.template ??
    rec.Template
  const linkedTemplate = coerceLinkedTemplate(linkedRaw)

  return {
    reportKey,
    name,
    description,
    endpoint,
    filters,
    linkedTemplate,
  }
}

function coerceCatalogList(raw: unknown): ReportCatalogItem[] {
  if (Array.isArray(raw)) {
    return raw
      .map(coerceCatalogItem)
      .filter((x): x is ReportCatalogItem => x != null)
  }
  if (raw && typeof raw === "object") {
    const rec = raw as Record<string, unknown>
    const list = rec.items ?? rec.Items ?? rec.rows ?? rec.Rows ?? rec.data
    if (Array.isArray(list)) {
      return list
        .map(coerceCatalogItem)
        .filter((x): x is ReportCatalogItem => x != null)
    }
  }
  return []
}

/**
 * GET /api/recruiter/reports/catalog
 * Returns the catalog of recruiter reports plus their currently linked template.
 */
export async function fetchReportsCatalog(): Promise<ReportCatalogItem[]> {
  const raw = await apiClient.get(REPORTS_CATALOG_ENDPOINT)
  return coerceCatalogList(raw)
}

/** True when the key exists in the recruiter reports catalog. */
export function isCatalogReportKey(
  reportKey: string,
  catalog: ReportCatalogItem[]
): boolean {
  const key = reportKey.trim()
  if (!key) return false
  return catalog.some((item) => item.reportKey === key)
}

function templateIdMatches(a: string, b: string | number): boolean {
  const left = normalizeTemplateId(a)
  const right = normalizeTemplateId(b)
  if (!left || !right) return false
  if (left === right) return true
  const ln = Number.parseInt(left, 10)
  const rn = Number.parseInt(right, 10)
  return !Number.isNaN(ln) && !Number.isNaN(rn) && ln === rn
}

/**
 * Returns the report whose `linkedTemplate` matches the given templateId.
 * The catalog is the single source of truth for "which report is linked to
 * this template" (recommended in the API guide instead of the admin-only
 * report-bindings list endpoint).
 */
export function findReportForTemplate(
  catalog: ReportCatalogItem[],
  templateId: string | number
): ReportCatalogItem | null {
  const id = normalizeTemplateId(templateId)
  if (!id) return null
  for (const item of catalog) {
    if (item.linkedTemplate && templateIdMatches(item.linkedTemplate.templateId, id)) {
      return item
    }
  }
  return null
}

/** Convenience helper: only the reportKey or null. */
export function findReportKeyForTemplate(
  catalog: ReportCatalogItem[],
  templateId: string | number
): string | null {
  return findReportForTemplate(catalog, templateId)?.reportKey ?? null
}
