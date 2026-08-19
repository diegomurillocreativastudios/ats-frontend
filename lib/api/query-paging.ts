import { apiClient } from "@/lib/api"

/** Server-side QueryLimits (BE-SEC-026): pageSize max 100. */
export const QUERY_PAGE_SIZE_MAX = 100
export const QUERY_PAGE_SIZE_DEFAULT = 50
export const QUERY_FETCH_ALL_PAGE_SIZE = 100
export const QUERY_FETCH_ALL_MAX_PAGES = 50
export const QUERY_PAGE_SIZE_OPTIONS = [20, 50, 100] as const
/** POST search-candidates limit max. */
export const QUERY_SEARCH_LIMIT_MAX = 50
export const QUERY_SEARCH_CANDIDATES_LIMIT = 20

export function clampSearchLimit(
  limit?: number,
  fallback = QUERY_SEARCH_CANDIDATES_LIMIT
): number {
  if (limit == null || !Number.isFinite(limit) || limit <= 0) return fallback
  return Math.min(Math.floor(limit), QUERY_SEARCH_LIMIT_MAX)
}

export interface HeaderPagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  hasNextPage: boolean
}

export function clampQueryPage(page?: number): number {
  if (page == null || !Number.isFinite(page) || page < 1) return 1
  return Math.floor(page)
}

export function clampQueryPageSize(
  pageSize?: number,
  fallback = QUERY_PAGE_SIZE_DEFAULT
): number {
  if (pageSize == null || !Number.isFinite(pageSize) || pageSize <= 0) {
    return fallback
  }
  return Math.min(Math.floor(pageSize), QUERY_PAGE_SIZE_MAX)
}

export function unwrapListArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data != null && typeof data === "object") {
    const record = data as Record<string, unknown>
    const nested =
      record.items ??
      record.candidates ??
      record.vacancies ??
      record.templates ??
      record.applications ??
      record.applicants ??
      record.data ??
      record.results ??
      record.Items ??
      record.Candidates ??
      record.Vacancies ??
      record.Templates ??
      record.Applications ??
      record.Applicants
    if (Array.isArray(nested)) return nested
  }
  return []
}

function readHeaderNumber(headers: Headers, names: string[]): number | null {
  for (const name of names) {
    const raw = headers.get(name)
    if (raw == null || String(raw).trim() === "") continue
    const value = Number(raw)
    if (Number.isFinite(value)) return value
  }
  return null
}

function readBodyNumber(data: unknown, keys: string[]): number | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return null
  }
  const record = data as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (value == null || value === "") continue
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * Reads paging from X-* headers, then JSON body, then infers from page fullness.
 */
export function readPagingMeta(
  headers: Headers,
  data: unknown,
  requested: { page: number; pageSize: number; itemCount: number }
): Omit<HeaderPagedResult<unknown>, "items"> {
  const headerPage = readHeaderNumber(headers, ["X-Page", "x-page"])
  const bodyPage = readBodyNumber(data, ["page", "Page"])
  const page =
    headerPage != null && headerPage >= 1
      ? headerPage
      : bodyPage != null && bodyPage >= 1
        ? bodyPage
        : requested.page

  const headerPageSize = readHeaderNumber(headers, [
    "X-Page-Size",
    "x-page-size",
  ])
  const bodyPageSize = readBodyNumber(data, [
    "pageSize",
    "page_size",
    "PageSize",
  ])
  const pageSize =
    headerPageSize != null && headerPageSize > 0
      ? headerPageSize
      : bodyPageSize != null && bodyPageSize > 0
        ? bodyPageSize
        : requested.pageSize

  const headerTotal = readHeaderNumber(headers, [
    "X-Total-Count",
    "x-total-count",
  ])
  const bodyTotal = readBodyNumber(data, [
    "totalCount",
    "total_count",
    "TotalCount",
    "total",
    "Total",
  ])
  const hasKnownTotal = headerTotal != null || bodyTotal != null
  let totalCount: number
  if (headerTotal != null && headerTotal >= 0) {
    totalCount = headerTotal
  } else if (bodyTotal != null && bodyTotal >= 0) {
    totalCount = bodyTotal
  } else if (requested.itemCount < requested.pageSize) {
    totalCount = (requested.page - 1) * requested.pageSize + requested.itemCount
  } else {
    totalCount = requested.page * requested.pageSize + 1
  }

  const hasNextPage = hasKnownTotal
    ? page * pageSize < totalCount
    : requested.itemCount >= requested.pageSize

  return { page, pageSize, totalCount, hasNextPage }
}

/**
 * Appends page/pageSize to a path that may already include a query string.
 */
export function buildPageQuery(
  pathWithOptionalQuery: string,
  page: number,
  pageSize: number
): string {
  const qIndex = pathWithOptionalQuery.indexOf("?")
  const pathname =
    qIndex >= 0 ? pathWithOptionalQuery.slice(0, qIndex) : pathWithOptionalQuery
  const existing = qIndex >= 0 ? pathWithOptionalQuery.slice(qIndex + 1) : ""
  const search = new URLSearchParams(existing)
  search.set("page", String(clampQueryPage(page)))
  search.set("pageSize", String(clampQueryPageSize(pageSize)))
  return `${pathname}?${search.toString()}`
}

export async function fetchHeaderPagedList<T = unknown>(
  path: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<HeaderPagedResult<T>> {
  const page = clampQueryPage(params.page)
  const pageSize = clampQueryPageSize(params.pageSize)
  const endpoint = buildPageQuery(path, page, pageSize)
  const { data, headers } = await apiClient.getWithHeaders(endpoint)
  const items = unwrapListArray(data) as T[]
  const meta = readPagingMeta(headers, data, {
    page,
    pageSize,
    itemCount: items.length,
  })
  return { items, ...meta }
}

export async function fetchAllHeaderPagedList<T = unknown>(
  path: string,
  pageSize = QUERY_FETCH_ALL_PAGE_SIZE
): Promise<T[]> {
  const all: T[] = []
  let page = 1
  for (;;) {
    const result = await fetchHeaderPagedList<T>(path, { page, pageSize })
    all.push(...result.items)
    if (!result.hasNextPage || result.items.length === 0) break
    if (result.totalCount > 0 && all.length >= result.totalCount) break
    page += 1
    if (page > QUERY_FETCH_ALL_MAX_PAGES) break
  }
  return all
}
