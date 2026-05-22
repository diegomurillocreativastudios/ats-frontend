import { apiClient } from "@/lib/api"
import type { ReportCatalogItem } from "@/lib/api/recruiter-reports-catalog"

/**
 * Thin runtime client for the recruiter report endpoints.
 *
 * The recruiter reports catalog (`GET /api/recruiter/reports/catalog`) returns
 * a list of available reports keyed by `reportKey`. Each entry exposes an
 * `endpoint` and a list of `filters` describing how the actual data endpoint
 * is queried (e.g. `vacancy-progress-by-client` -> `GET
 * /api/recruiter/reports/vacancy-progress-by-client`). This module gives
 * callers a single way to fetch any of those endpoints by `reportKey`
 * without having to special-case each report at the call site.
 */

export const RECRUITER_REPORTS_PREFIX = "/api/recruiter/reports"

export type ReportRuntimeRow = Record<string, unknown>

export interface ReportRuntimeResponse {
  rows: ReportRuntimeRow[]
  totalCount: number
}

function buildEndpoint(input: {
  reportKey: string
  endpoint?: string | null
}): string {
  const endpoint = input.endpoint?.trim() ?? ""
  if (endpoint) return endpoint
  const key = input.reportKey.trim()
  return `${RECRUITER_REPORTS_PREFIX}/${encodeURIComponent(key)}`
}

function appendQueryEntry(sp: URLSearchParams, key: string, value: unknown) {
  if (value == null) return
  if (Array.isArray(value)) {
    for (const v of value) {
      if (v == null) continue
      const s = String(v).trim()
      if (s === "") continue
      sp.append(key, s)
    }
    return
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>
    appendQueryEntry(sp, `${key}From`, rec.from ?? rec.dateFrom ?? rec.start)
    appendQueryEntry(sp, `${key}To`, rec.to ?? rec.dateTo ?? rec.end)
    return
  }
  const s = String(value).trim()
  if (s === "") return
  sp.set(key, s)
}

export function buildRecruiterReportQuery(
  filters: Record<string, unknown>
): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    appendQueryEntry(sp, key, value)
  }
  const q = sp.toString()
  return q ? `?${q}` : ""
}

function coerceRows(raw: unknown): ReportRuntimeRow[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (r): r is ReportRuntimeRow => r != null && typeof r === "object"
  )
}

export function coerceRecruiterReportResponse(
  raw: unknown
): ReportRuntimeResponse {
  if (!raw || typeof raw !== "object") return { rows: [], totalCount: 0 }
  const rec = raw as Record<string, unknown>
  const rowsRaw =
    rec.rows ?? rec.Rows ?? rec.items ?? rec.Items ?? rec.data ?? rec.Data
  const rows = coerceRows(rowsRaw)
  const totalRaw =
    rec.totalCount ?? rec.TotalCount ?? rec.total ?? rec.Total ?? rows.length
  const totalCount =
    typeof totalRaw === "number" && !Number.isNaN(totalRaw)
      ? totalRaw
      : Number.parseInt(String(totalRaw), 10)
  return {
    rows,
    totalCount: Number.isFinite(totalCount) ? totalCount : rows.length,
  }
}

export interface FetchRecruiterReportByKeyInput {
  reportKey: string
  endpoint?: string | null
  filters?: Record<string, unknown>
}

/**
 * Calls the recruiter report endpoint that corresponds to the given `reportKey`
 * (or `endpoint` override) and returns `{ rows, totalCount }`. The function
 * accepts arbitrary filters; empty/nullish values are dropped from the query
 * string so the backend applies its defaults.
 */
export async function fetchRecruiterReportByKey(
  input: FetchRecruiterReportByKeyInput
): Promise<ReportRuntimeResponse> {
  const url = `${buildEndpoint(input)}${buildRecruiterReportQuery(
    input.filters ?? {}
  )}`
  const raw = await apiClient.get(url)
  return coerceRecruiterReportResponse(raw)
}

export function fetchRecruiterReportForCatalogItem(
  item: Pick<ReportCatalogItem, "reportKey" | "endpoint">,
  filters: Record<string, unknown>
): Promise<ReportRuntimeResponse> {
  return fetchRecruiterReportByKey({
    reportKey: item.reportKey,
    endpoint: item.endpoint,
    filters,
  })
}
