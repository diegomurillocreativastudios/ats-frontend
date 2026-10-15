import { fetchVacancyProgressByClient } from "@/lib/api/recruiter-reports"
import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import { listRecruiterVacanciesPage } from "@/lib/api/recruiter-vacancies"
import { mapVacancyFromApi, type VacancyListItem } from "@/lib/vacancies/map-vacancy-list-item"
import {
  createPagedLoadState,
  foldPagedBatch,
  VACANCY_LIST_MAX_PAGES,
  VACANCY_LIST_PAGE_SIZE,
  type PagedBatch,
} from "@/lib/rrhh/vacancy-list-views"

export interface LoadedVacancySources {
  listItems: VacancyListItem[]
  listTotal: number
  listTruncated: boolean
  progressRows: VacancyProgressByClientRow[]
  progressTotal: number
  progressTruncated: boolean
}

export async function loadVacancyListSources(): Promise<LoadedVacancySources> {
  const [listLoad, progressLoad] = await Promise.all([
    loadUntilCapped((page, pageSize) => loadVacancyListPage(page, pageSize)),
    loadUntilCapped((page, pageSize) => loadOpenProgressPage(page, pageSize)),
  ])
  return {
    listItems: listLoad.items,
    listTotal: listLoad.totalCount,
    listTruncated: listLoad.truncated,
    progressRows: progressLoad.items,
    progressTotal: progressLoad.totalCount,
    progressTruncated: progressLoad.truncated,
  }
}

/** Loads vacancies with presentation deadline overdue (server filter). */
export async function loadPresentationOverdueVacancies(): Promise<{
  items: VacancyListItem[]
  totalCount: number
  truncated: boolean
}> {
  const load = await loadUntilCapped((page, pageSize) =>
    loadVacancyListPage(page, pageSize, { presentationOverdue: true })
  )
  return {
    items: load.items,
    totalCount: load.totalCount,
    truncated: load.truncated,
  }
}

async function loadUntilCapped<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PagedBatch<T>>
): Promise<{ items: T[]; totalCount: number; truncated: boolean }> {
  let state = createPagedLoadState<T>()
  while (!state.done) {
    const batch = await fetchPage(state.page, VACANCY_LIST_PAGE_SIZE)
    state = foldPagedBatch(state, batch, VACANCY_LIST_MAX_PAGES)
  }
  return {
    items: state.items,
    totalCount: state.totalCount,
    truncated: state.truncated,
  }
}

async function loadVacancyListPage(
  page: number,
  pageSize: number,
  filters: {
    vacancyTypeId?: string
    presentationOverdue?: boolean
    presentationDueWithinDays?: number
  } = {}
): Promise<PagedBatch<VacancyListItem>> {
  const result = await listRecruiterVacanciesPage({ page, pageSize, ...filters })
  const offset = (page - 1) * pageSize
  return {
    items: result.items.map((item, index) =>
      mapVacancyFromApi(item as Record<string, unknown>, offset + index)
    ),
    totalCount: result.totalCount,
    hasNextPage: result.hasNextPage,
  }
}

async function loadOpenProgressPage(
  page: number,
  pageSize: number
): Promise<PagedBatch<VacancyProgressByClientRow>> {
  const result = await fetchVacancyProgressByClient({
    page,
    pageSize,
    vacancyStatus: "open",
  })
  const fetchedThrough = page * pageSize
  return {
    items: result.rows,
    totalCount: result.totalCount,
    hasNextPage: result.rows.length > 0 && fetchedThrough < result.totalCount,
  }
}
