import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import { getVacancyHealth } from "@/lib/reportes-avance-vacantes-helpers"
import {
  normalizeVacancyStatusSlug,
  vacancyDaysOpenForDisplay,
} from "@/lib/reportes-metrics"
import { buildRecruiterVacancyPath } from "@/lib/vacancies/vacancy-public-path"
import type { VacancyListStatusKey } from "@/lib/vacancies/map-vacancy-list-item"
import {
  selectActiveVacancies,
  selectPresentationOverdueVacancies,
  selectUnpublishedVacancies,
  selectWithoutCandidateRows,
} from "@/lib/rrhh/vacancy-list-views"

export const VACANCY_DASHBOARD_ATTENTION_LIMIT = 6

export type VacancyAttentionSignal =
  | "critical"
  | "attention"
  | "overdue"
  | "unpublished"

export interface VacancyDashboardListItem {
  id: string
  publicSlug: string | null
  title: string
  company: string
  status: VacancyListStatusKey
  isPublished: boolean
  candidates: number
  presentationDueAtUtc: string | null
}

export interface VacancyAttentionRow {
  vacancyId: string
  title: string
  clientName: string | null
  daysOpen: number | null
  candidateCount: number
  signal: VacancyAttentionSignal
  href: string
}

export interface VacancyDashboardPartial {
  analyzed: number
  total: number
}

export interface VacancyDashboardSnapshot {
  activeVacancies: number
  withoutCandidates: number
  overdue: number
  unpublished: number
  attention: VacancyAttentionRow[]
  progressPartial: VacancyDashboardPartial | null
  listPartial: VacancyDashboardPartial | null
}

export interface BuildVacancyDashboardSnapshotInput {
  progressRows: readonly VacancyProgressByClientRow[]
  progressTotal: number
  listItems: readonly VacancyDashboardListItem[]
  listTotal: number
  now?: Date
}

const SIGNAL_RANK: Record<VacancyAttentionSignal, number> = {
  critical: 0,
  attention: 1,
  overdue: 2,
  unpublished: 3,
}

export function buildVacancyDashboardSnapshot(
  input: BuildVacancyDashboardSnapshotInput
): VacancyDashboardSnapshot {
  const now = input.now ?? new Date()
  const listById = indexList(input.listItems)
  const openRows = input.progressRows.filter(isOpenProgressRow)
  const withoutCandidates = selectWithoutCandidateRows(input.progressRows).length
  const overdueItems = selectPresentationOverdueVacancies(input.listItems, now)
  const overdue = overdueItems.length
  const unpublishedItems = selectUnpublishedVacancies(input.listItems)
  const attentionById = new Map<string, VacancyAttentionRow>()

  for (const item of overdueItems) {
    const vacancyId = item.id.trim()
    if (vacancyId === "") continue
    const progress = openRows.find((row) => readVacancyId(row) === vacancyId) ?? null
    considerAttention(
      attentionById,
      toPresentationOverdueRow(item, progress, now)
    )
  }

  for (const row of openRows) {
    const vacancyId = readVacancyId(row)
    if (!vacancyId) continue
    if (attentionById.has(vacancyId)) continue
    const listItem = listById.get(vacancyId) ?? null
    const signal = signalForOpenRow(row, listItem, now)
    if (!signal || signal === "overdue") continue
    considerAttention(attentionById, toAttentionRow(row, listItem, vacancyId, signal, now))
  }

  for (const item of unpublishedItems) {
    const vacancyId = item.id.trim()
    if (vacancyId === "" || attentionById.has(vacancyId)) continue
    const progress = openRows.find((row) => readVacancyId(row) === vacancyId) ?? null
    considerAttention(
      attentionById,
      toListOnlyRow(item, progress, now)
    )
  }

  const attention = [...attentionById.values()]
    .sort(compareAttention)
    .slice(0, VACANCY_DASHBOARD_ATTENTION_LIMIT)

  return {
    activeVacancies: selectActiveVacancies(input.listItems).length,
    withoutCandidates,
    overdue,
    unpublished: unpublishedItems.length,
    attention,
    progressPartial: pagePartial(input.progressRows.length, input.progressTotal),
    listPartial: pagePartial(input.listItems.length, input.listTotal),
  }
}

function isOpenProgressRow(row: VacancyProgressByClientRow): boolean {
  return normalizeVacancyStatusSlug(row.vacancyStatus) === "open"
}

function isUnpublishedActive(item: VacancyDashboardListItem): boolean {
  return item.status === "activa" && item.isPublished === false
}

function signalForOpenRow(
  row: VacancyProgressByClientRow,
  listItem: VacancyDashboardListItem | null,
  now: Date
): VacancyAttentionSignal | null {
  const health = getVacancyHealth(row, now)
  if (health === "critica") return "critical"
  if (health === "atencion") return "attention"
  if (
    listItem?.presentationDueAtUtc &&
    listItem.status === "activa" &&
    !Number.isNaN(new Date(listItem.presentationDueAtUtc).getTime()) &&
    new Date(listItem.presentationDueAtUtc).getTime() < now.getTime()
  ) {
    return "overdue"
  }
  if (listItem && isUnpublishedActive(listItem)) return "unpublished"
  return null
}

function toPresentationOverdueRow(
  item: VacancyDashboardListItem,
  progress: VacancyProgressByClientRow | null,
  now: Date
): VacancyAttentionRow {
  const vacancyId = item.id.trim()
  return {
    vacancyId,
    title: readTitle(item.title) ?? "",
    clientName: readTitle(item.company),
    daysOpen: progress ? vacancyDaysOpenForDisplay(progress, now) : null,
    candidateCount:
      progress != null ? candidateCount(progress) : item.candidates,
    signal: "overdue",
    href: buildRecruiterVacancyPath({
      id: vacancyId,
      publicSlug: item.publicSlug,
    }),
  }
}

function toAttentionRow(
  row: VacancyProgressByClientRow,
  listItem: VacancyDashboardListItem | null,
  vacancyId: string,
  signal: VacancyAttentionSignal,
  now: Date
): VacancyAttentionRow {
  return {
    vacancyId,
    title: readTitle(row.vacancyTitle) ?? readTitle(listItem?.title) ?? "",
    clientName: readClientName(row.clientName, row.companyName) ?? readTitle(listItem?.company) ?? null,
    daysOpen: vacancyDaysOpenForDisplay(row, now),
    candidateCount: candidateCount(row),
    signal,
    href: buildRecruiterVacancyPath({
      id: vacancyId,
      publicSlug: listItem?.publicSlug ?? null,
    }),
  }
}

function toListOnlyRow(
  item: VacancyDashboardListItem,
  progress: VacancyProgressByClientRow | null,
  now: Date
): VacancyAttentionRow {
  const vacancyId = item.id.trim()
  return {
    vacancyId,
    title: readTitle(item.title) ?? "",
    clientName: readTitle(item.company),
    daysOpen: progress ? vacancyDaysOpenForDisplay(progress, now) : null,
    candidateCount:
      progress != null ? candidateCount(progress) : item.candidates,
    signal: "unpublished",
    href: buildRecruiterVacancyPath({
      id: vacancyId,
      publicSlug: item.publicSlug,
    }),
  }
}

function considerAttention(
  byId: Map<string, VacancyAttentionRow>,
  row: VacancyAttentionRow
) {
  const current = byId.get(row.vacancyId)
  if (!current || SIGNAL_RANK[row.signal] < SIGNAL_RANK[current.signal]) {
    byId.set(row.vacancyId, row)
  }
}

function compareAttention(a: VacancyAttentionRow, b: VacancyAttentionRow): number {
  const rank = SIGNAL_RANK[a.signal] - SIGNAL_RANK[b.signal]
  if (rank !== 0) return rank
  return a.title.localeCompare(b.title, "es", { sensitivity: "base" })
}

function candidateCount(row: VacancyProgressByClientRow): number {
  return typeof row.totalCandidates === "number" && !Number.isNaN(row.totalCandidates)
    ? row.totalCandidates
    : 0
}

function readVacancyId(row: VacancyProgressByClientRow): string | null {
  const id = row.vacancyId?.trim() ?? ""
  return id === "" ? null : id
}

function readTitle(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  if (trimmed === "" || trimmed === "—") return null
  return trimmed
}

function readClientName(
  clientName: string | null | undefined,
  companyName: string | null | undefined
): string | null {
  return readTitle(clientName) ?? readTitle(companyName)
}

function indexList(
  items: readonly VacancyDashboardListItem[]
): Map<string, VacancyDashboardListItem> {
  const map = new Map<string, VacancyDashboardListItem>()
  for (const item of items) {
    const id = item.id.trim()
    if (id !== "" && !map.has(id)) map.set(id, item)
  }
  return map
}

function pagePartial(analyzed: number, total: number): VacancyDashboardPartial | null {
  if (!Number.isFinite(total) || total <= analyzed) return null
  return { analyzed, total }
}
