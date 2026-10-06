import { cache } from "react"

import {
  buildPublicVacanciesQuery,
  normalizeOpportunityDetail,
  normalizeOpportunityListResponse,
  type OpportunityVacancyDetail,
  type OpportunityVacancySummary,
} from "@/lib/api/public-vacancies"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import { isVacancyGuid } from "@/lib/vacancies/vacancy-public-path"

const SITEMAP_PAGE_SIZE = 100
const DEFAULT_MAX_SITEMAP_PAGES = 50

export type PublicVacancyLoadResult =
  | { status: "ok"; vacancy: OpportunityVacancyDetail }
  | { status: "not_found" }
  | { status: "unavailable" }

function backendBase(): string | null {
  const base = getServerBackendBaseUrl()
  return base || null
}

async function fetchBackend(pathWithQuery: string): Promise<Response> {
  const base = backendBase()
  if (!base) {
    throw new Error("Backend URL is not configured")
  }
  return fetch(`${base}${pathWithQuery}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
}

export async function loadPublicVacancyBySegment(
  segment: string
): Promise<PublicVacancyLoadResult> {
  const trimmed = segment.trim()
  if (!trimmed) return { status: "not_found" }
  if (!backendBase()) return { status: "unavailable" }

  const path = isVacancyGuid(trimmed)
    ? `/api/vacantes/${encodeURIComponent(trimmed)}`
    : `/api/vacantes/by-public-slug/${encodeURIComponent(trimmed)}`

  try {
    const response = await fetchBackend(path)
    if (response.status === 404 || response.status === 400) return { status: "not_found" }
    if (!response.ok) return { status: "unavailable" }
    const vacancy = normalizeOpportunityDetail(await response.json())
    if (!vacancy) return { status: "unavailable" }
    return { status: "ok", vacancy }
  } catch {
    return { status: "unavailable" }
  }
}

export const loadPublicVacancyForSeo = cache(loadPublicVacancyBySegment)

export async function listOpenPublicVacancies(options?: {
  maxPages?: number
  pageSize?: number
}): Promise<OpportunityVacancySummary[]> {
  if (!backendBase()) return []

  const maxPages = options?.maxPages ?? DEFAULT_MAX_SITEMAP_PAGES
  const pageSize = options?.pageSize ?? SITEMAP_PAGE_SIZE
  const items: OpportunityVacancySummary[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= maxPages; page += 1) {
    const query = buildPublicVacanciesQuery({
      filter: "openVacancies",
      page,
      pageSize,
    })
    const response = await fetchBackend(`/api/vacantes${query}`)
    if (!response.ok) {
      throw new Error(`Public vacancy list failed (${response.status})`)
    }
    const parsed = normalizeOpportunityListResponse(await response.json())
    if (parsed.items.length === 0) break

    let added = 0
    for (const item of parsed.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
      added += 1
    }
    if (added === 0 || !parsed.pagination.hasNextPage) break
  }

  return items
}
