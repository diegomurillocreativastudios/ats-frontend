import { getApiErrorMessage } from "@/lib/api-error"
import {
  QUERY_FETCH_ALL_MAX_PAGES,
  QUERY_FETCH_ALL_PAGE_SIZE,
  readPagingMeta,
  unwrapListArray,
} from "@/lib/api/query-paging"
import {
  mapTemplatesList,
  type TemplateListItem,
} from "@/lib/templates/technical-sheet-template"

/**
 * Lista plantillas desde el backend con Bearer (Route Handlers / servidor).
 */
export async function fetchTemplatesListForServer(
  baseUrl: string,
  accessToken: string
): Promise<TemplateListItem[]> {
  const root = baseUrl.replace(/\/$/, "")
  const all: unknown[] = []
  let page = 1
  for (;;) {
    const search = new URLSearchParams({
      type: "Document",
      page: String(page),
      pageSize: String(QUERY_FETCH_ALL_PAGE_SIZE),
    })
    const res = await fetch(`${root}/api/Templates?${search.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })
    const raw = await res.json().catch(() => null)
    if (!res.ok) {
      const message =
        getApiErrorMessage(raw) ||
        getApiErrorMessage(res.statusText) ||
        `No se pudieron cargar las plantillas (${res.status})`
      const err = new Error(message) as Error & { status: number }
      err.status = res.status
      throw err
    }
    const items = unwrapListArray(raw)
    all.push(...items)
    const meta = readPagingMeta(res.headers, raw, {
      page,
      pageSize: QUERY_FETCH_ALL_PAGE_SIZE,
      itemCount: items.length,
    })
    if (!meta.hasNextPage || items.length === 0) break
    if (meta.totalCount > 0 && all.length >= meta.totalCount) break
    page += 1
    if (page > QUERY_FETCH_ALL_MAX_PAGES) break
  }
  return mapTemplatesList(all)
}
