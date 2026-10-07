import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import {
  QUERY_FETCH_ALL_MAX_PAGES,
  QUERY_FETCH_ALL_PAGE_SIZE,
} from "@/lib/api/query-paging"
import { DASHBOARD_SLOW_VACANCY_DAYS } from "@/lib/rrhh/recruiter-dashboard"
import {
  normalizeVacancyStatusSlug,
  vacancyDaysOpenForDisplay,
} from "@/lib/reportes-metrics"
import type { VacancyListStatusKey } from "@/lib/vacancies/map-vacancy-list-item"
import { buildRecruiterVacancyPath } from "@/lib/vacancies/vacancy-public-path"

export const VACANCY_LIST_VIEWS = [
  "activas",
  "sin-postulaciones",
  "fuera-de-plazo",
  "no-publicadas",
] as const

export type VacancyListView = (typeof VACANCY_LIST_VIEWS)[number]

const VACANCY_LIST_VIEW_SET: ReadonlySet<string> = new Set(VACANCY_LIST_VIEWS)

export const VACANCY_LIST_PAGE_SIZE = QUERY_FETCH_ALL_PAGE_SIZE
export const VACANCY_LIST_MAX_PAGES = QUERY_FETCH_ALL_MAX_PAGES

export interface VacancyViewListSource {
  id: string
  publicSlug: string | null
  title: string
  status: VacancyListStatusKey
  isPublished: boolean
}

export interface VacancyProgressViewRow {
  vacancyId: string
  title: string
  clientName: string | null
  daysOpen: number | null
  candidateCount: number
  href: string
}

export interface PagedBatch<T> {
  items: readonly T[]
  totalCount: number
  hasNextPage: boolean
}

export interface PagedLoadState<T> {
  items: T[]
  totalCount: number
  page: number
  truncated: boolean
  done: boolean
}

export function vacancyListViewPath(view: VacancyListView): string {
  return `/portal-rrhh/vacantes?vista=${view}`
}

export function parseVacancyListView(value: string | null | undefined): VacancyListView | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!VACANCY_LIST_VIEW_SET.has(trimmed)) return null
  return trimmed as VacancyListView
}

export function isProgressVacancyListView(view: VacancyListView): boolean {
  return view === "sin-postulaciones" || view === "fuera-de-plazo"
}

export function createPagedLoadState<T>(): PagedLoadState<T> {
  return { items: [], totalCount: 0, page: 1, truncated: false, done: false }
}

export function foldPagedBatch<T>(
  state: PagedLoadState<T>,
  batch: PagedBatch<T>,
  maxPages: number = VACANCY_LIST_MAX_PAGES
): PagedLoadState<T> {
  const items = [...state.items, ...batch.items]
  const totalCount = batch.totalCount
  const reachedTotal = totalCount > 0 && items.length >= totalCount
  const emptyPage = batch.items.length === 0
  const noNext = !batch.hasNextPage
  if (reachedTotal || emptyPage || noNext) {
    return {
      items,
      totalCount,
      page: state.page,
      truncated: totalCount > items.length,
      done: true,
    }
  }
  if (state.page >= maxPages) {
    return {
      items,
      totalCount,
      page: state.page,
      truncated: true,
      done: true,
    }
  }
  return {
    items,
    totalCount,
    page: state.page + 1,
    truncated: false,
    done: false,
  }
}

export function selectActiveVacancies<T extends VacancyViewListSource>(
  items: readonly T[]
): T[] {
  return items.filter((item) => item.status === "activa")
}

export function selectUnpublishedVacancies<T extends VacancyViewListSource>(
  items: readonly T[]
): T[] {
  return items.filter((item) => item.status === "activa" && item.isPublished === false)
}

export function selectWithoutCandidateRows(
  rows: readonly VacancyProgressByClientRow[]
): VacancyProgressByClientRow[] {
  return rows.filter(
    (row) => isOpenProgressRow(row) && progressVacancyId(row) != null && candidateCount(row) === 0
  )
}

export function selectOverdueRows(
  rows: readonly VacancyProgressByClientRow[],
  now: Date = new Date()
): VacancyProgressByClientRow[] {
  return rows.filter((row) => {
    if (!isOpenProgressRow(row) || progressVacancyId(row) == null) return false
    const days = vacancyDaysOpenForDisplay(row, now)
    return days != null && days >= DASHBOARD_SLOW_VACANCY_DAYS
  })
}

export function toProgressViewRows(
  rows: readonly VacancyProgressByClientRow[],
  listItems: readonly VacancyViewListSource[],
  now: Date = new Date()
): VacancyProgressViewRow[] {
  const listById = new Map<string, VacancyViewListSource>()
  for (const item of listItems) {
    const id = item.id.trim()
    if (id !== "" && !listById.has(id)) listById.set(id, item)
  }
  const mapped: VacancyProgressViewRow[] = []
  for (const row of rows) {
    const vacancyId = progressVacancyId(row)
    if (!vacancyId) continue
    const listItem = listById.get(vacancyId) ?? null
    mapped.push({
      vacancyId,
      title: readTitle(row.vacancyTitle) ?? readTitle(listItem?.title) ?? "",
      clientName:
        readTitle(row.clientName) ?? readTitle(row.companyName) ?? null,
      daysOpen: vacancyDaysOpenForDisplay(row, now),
      candidateCount: candidateCount(row),
      href: buildRecruiterVacancyPath({
        id: vacancyId,
        publicSlug: listItem?.publicSlug ?? null,
      }),
    })
  }
  return mapped
}

function isOpenProgressRow(row: VacancyProgressByClientRow): boolean {
  return normalizeVacancyStatusSlug(row.vacancyStatus) === "open"
}

function progressVacancyId(row: VacancyProgressByClientRow): string | null {
  const id = row.vacancyId?.trim() ?? ""
  return id === "" ? null : id
}

function candidateCount(row: VacancyProgressByClientRow): number {
  return typeof row.totalCandidates === "number" && !Number.isNaN(row.totalCandidates)
    ? row.totalCandidates
    : 0
}

function readTitle(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  if (trimmed === "" || trimmed === "—") return null
  return trimmed
}
