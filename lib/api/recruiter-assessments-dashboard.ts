import { apiClient } from "@/lib/api"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import type { AssessmentKind, AssignmentStatus } from "@/lib/pruebas/types"

const DASHBOARD_PATH = "/api/recruiter/assessments/dashboard"

/** Inclusive day span at or below this fills empty days in the activity series. */
export const ACTIVITY_FILL_MAX_DAYS = 92

export type AssessmentsDashboardStatusFilter =
  | AssignmentStatus
  | "pending_manual_review"

export interface AssessmentsDashboardFilters {
  companyId?: string | null
  vacancyId?: string | null
  kind?: AssessmentKind | null
  assignmentStatus?: AssessmentsDashboardStatusFilter | null
  /** Inclusive start day YYYY-MM-DD (UTC). */
  assignedFrom?: string | null
  /** Inclusive end day YYYY-MM-DD (UTC). */
  assignedTo?: string | null
}

export interface AssessmentsDashboardCounts {
  assigned: number
  pending: number
  inProgress: number
  completed: number
  expired: number
  cancelled: number
  pendingReview: number
}

export interface AssessmentsDashboardActivityPoint {
  date: string
  count: number
}

export interface AssessmentsDashboardStatusSlice {
  status: AssignmentStatus
  count: number
}

export interface AssessmentsDashboardAttentionItem {
  assignmentId: string
  candidateName: string
  vacancyTitle: string
  testTitle: string
  expiresAt: string | null
  href: string
}

export interface AssessmentsDashboardReviewItem {
  assignmentId: string
  candidateName: string
  vacancyTitle: string
  testTitle: string
  href: string
}

export interface AssessmentsDashboardActivityItem {
  assignmentId: string
  candidateName: string
  vacancyTitle: string
  testTitle: string
  status: string
  assignedAt: string
  href: string
}

export interface AssessmentsDashboardFilterOption {
  id: string
  label: string
}

export interface AssessmentsDashboardVacancyOption
  extends AssessmentsDashboardFilterOption {
  companyId: string | null
}

export interface AssessmentsDashboardView {
  counts: AssessmentsDashboardCounts
  activitySeries: AssessmentsDashboardActivityPoint[]
  statusDistribution: AssessmentsDashboardStatusSlice[]
  dueSoon: AssessmentsDashboardAttentionItem[]
  pendingReviews: AssessmentsDashboardReviewItem[]
  recentActivity: AssessmentsDashboardActivityItem[]
  isEmpty: boolean
  isFilterEmpty: boolean
}

const DONUT_STATUS_ORDER: AssignmentStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "expired",
  "cancelled",
]

const CATEGORY_TO_API: Record<AssessmentKind, string> = {
  technical: "Technical",
  psychometric: "Psychometric",
}

const STATUS_TO_API: Record<AssessmentsDashboardStatusFilter, string> = {
  pending: "Pending",
  in_progress: "InProgress",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
  pending_manual_review: "PendingManualReview",
}

const STATUS_FROM_API: Record<string, AssignmentStatus> = {
  Pending: "pending",
  InProgress: "in_progress",
  Completed: "completed",
  Expired: "expired",
  Cancelled: "cancelled",
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickString(
  raw: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = raw[key]
    if (value != null && String(value).trim() !== "") {
      return String(value).trim()
    }
  }
  return null
}

function pickNumber(raw: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value))
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number.parseInt(value, 10)
      if (Number.isFinite(parsed)) {
        return Math.max(0, parsed)
      }
    }
  }
  return 0
}

function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function dayKeyOrNull(value: string | null | undefined): string | null {
  if (!value) return null
  const key = value.length >= 10 ? value.slice(0, 10) : value
  return isYmd(key) ? key : null
}

/**
 * Builds the query string for GET /api/recruiter/assessments/dashboard.
 * Empty filters are omitted. Dates are start/end of UTC day.
 */
export function buildAssessmentsDashboardQuery(
  filters: AssessmentsDashboardFilters = {},
): string {
  const params = new URLSearchParams()

  const clientId = filters.companyId?.trim()
  if (clientId) params.set("clientId", clientId)

  const vacancyId = filters.vacancyId?.trim()
  if (vacancyId) params.set("vacancyId", vacancyId)

  if (filters.kind) {
    params.set("category", CATEGORY_TO_API[filters.kind])
  }

  if (filters.assignmentStatus) {
    params.set("status", STATUS_TO_API[filters.assignmentStatus])
  }

  const from = dayKeyOrNull(filters.assignedFrom)
  if (from) {
    params.set("assignedFromUtc", `${from}T00:00:00Z`)
  }

  const to = dayKeyOrNull(filters.assignedTo)
  if (to) {
    params.set("assignedToUtc", `${to}T23:59:59Z`)
  }

  const qs = params.toString()
  return qs === "" ? "" : `?${qs}`
}

export function hasAssessmentsDashboardFilters(
  filters: AssessmentsDashboardFilters,
): boolean {
  return Boolean(
    filters.companyId ||
      filters.vacancyId ||
      filters.kind ||
      filters.assignmentStatus ||
      filters.assignedFrom ||
      filters.assignedTo,
  )
}

function inclusiveDaySpan(fromYmd: string, toYmd: string): number | null {
  const fromMs = Date.parse(`${fromYmd}T00:00:00.000Z`)
  const toMs = Date.parse(`${toYmd}T00:00:00.000Z`)
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs > toMs) {
    return null
  }
  return Math.floor((toMs - fromMs) / (24 * 60 * 60 * 1000)) + 1
}

function addUtcDays(ymd: string, days: number): string {
  const ms = Date.parse(`${ymd}T00:00:00.000Z`) + days * 24 * 60 * 60 * 1000
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Sparse series from the API. When both date filters are set and the inclusive
 * span is ≤ ACTIVITY_FILL_MAX_DAYS, empty days are filled with count 0.
 */
export function fillActivitySeries(
  sparse: AssessmentsDashboardActivityPoint[],
  assignedFrom: string | null | undefined,
  assignedTo: string | null | undefined,
): AssessmentsDashboardActivityPoint[] {
  const from = dayKeyOrNull(assignedFrom)
  const to = dayKeyOrNull(assignedTo)
  const byDay = new Map(
    sparse
      .filter((point) => isYmd(point.date))
      .map((point) => [point.date, point.count] as const),
  )

  if (!from || !to) {
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
  }

  const span = inclusiveDaySpan(from, to)
  if (span == null || span > ACTIVITY_FILL_MAX_DAYS) {
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
  }

  const filled: AssessmentsDashboardActivityPoint[] = []
  for (let i = 0; i < span; i += 1) {
    const date = addUtcDays(from, i)
    filled.push({ date, count: byDay.get(date) ?? 0 })
  }
  return filled
}

function mapDonutStatus(raw: string | null): AssignmentStatus | null {
  if (!raw) return null
  return STATUS_FROM_API[raw] ?? null
}

function activityHref(statusRaw: string): string {
  if (statusRaw === "Completed") {
    return `${PRUEBAS_HOME_HREF}/resultados`
  }
  if (statusRaw === "PendingManualReview") {
    return `${PRUEBAS_HOME_HREF}/revision`
  }
  return `${PRUEBAS_HOME_HREF}/seguimiento`
}

function mapDashboardItem(raw: unknown): {
  assignmentId: string
  candidateName: string
  vacancyTitle: string
  testTitle: string
  status: string
  assignedAt: string
  expiresAt: string | null
} | null {
  const record = asRecord(raw)
  if (!record) return null
  const assignmentId = pickString(record, ["assignmentId", "assignment_id"])
  if (!assignmentId) return null
  return {
    assignmentId,
    candidateName: pickString(record, ["candidateName", "candidate_name"]) ?? "—",
    vacancyTitle: pickString(record, ["vacancyTitle", "vacancy_title"]) ?? "—",
    testTitle:
      pickString(record, ["assessmentTitle", "assessment_title", "testTitle"]) ??
      "—",
    status: pickString(record, ["status"]) ?? "",
    assignedAt: pickString(record, ["assignedAtUtc", "assignedAt"]) ?? "",
    expiresAt: pickString(record, ["expiresAtUtc", "expiresAt"]),
  }
}

function buildStatusDistribution(
  rawSlices: unknown,
): AssessmentsDashboardStatusSlice[] {
  const byStatus = new Map<AssignmentStatus, number>()
  for (const status of DONUT_STATUS_ORDER) {
    byStatus.set(status, 0)
  }

  const list = Array.isArray(rawSlices) ? rawSlices : []
  for (const item of list) {
    const record = asRecord(item)
    if (!record) continue
    const status = mapDonutStatus(pickString(record, ["status"]))
    if (!status) continue
    byStatus.set(status, pickNumber(record, ["count"]))
  }

  return DONUT_STATUS_ORDER.map((status) => ({
    status,
    count: byStatus.get(status) ?? 0,
  }))
}

/**
 * Normalizes the AssessmentDashboard body into the view model for the portal.
 */
export function normalizeAssessmentsDashboard(
  raw: unknown,
  filters: AssessmentsDashboardFilters = {},
): AssessmentsDashboardView {
  const root = asRecord(raw) ?? {}
  const kpis = asRecord(root.kpis) ?? {}

  const counts: AssessmentsDashboardCounts = {
    assigned: pickNumber(kpis, ["assigned"]),
    pending: pickNumber(kpis, ["pending"]),
    inProgress: pickNumber(kpis, ["inProgress", "in_progress"]),
    completed: pickNumber(kpis, ["completed"]),
    expired: pickNumber(kpis, ["expired"]),
    cancelled: pickNumber(kpis, ["cancelled"]),
    pendingReview: pickNumber(kpis, [
      "pendingManualReview",
      "pending_manual_review",
    ]),
  }

  const sparseSeries: AssessmentsDashboardActivityPoint[] = (
    Array.isArray(root.assignmentsPerDay) ? root.assignmentsPerDay : []
  )
    .map((item) => {
      const record = asRecord(item)
      if (!record) return null
      const date = dayKeyOrNull(pickString(record, ["dayUtc", "day", "date"]))
      if (!date) return null
      return { date, count: pickNumber(record, ["count"]) }
    })
    .filter((item): item is AssessmentsDashboardActivityPoint => item != null)

  const activitySeries = fillActivitySeries(
    sparseSeries,
    filters.assignedFrom,
    filters.assignedTo,
  )

  const statusDistribution = buildStatusDistribution(root.statusDistribution)

  const needsAttention = asRecord(root.needsAttention) ?? {}
  const dueSoonRaw = Array.isArray(needsAttention.dueSoon)
    ? needsAttention.dueSoon
    : []
  const reviewRaw = Array.isArray(needsAttention.pendingManualReview)
    ? needsAttention.pendingManualReview
    : []
  const recentRaw = Array.isArray(root.recentActivity)
    ? root.recentActivity
    : []

  const dueSoon: AssessmentsDashboardAttentionItem[] = dueSoonRaw
    .map((item) => {
      const mapped = mapDashboardItem(item)
      if (!mapped) return null
      return {
        assignmentId: mapped.assignmentId,
        candidateName: mapped.candidateName,
        vacancyTitle: mapped.vacancyTitle,
        testTitle: mapped.testTitle,
        expiresAt: mapped.expiresAt,
        href: `${PRUEBAS_HOME_HREF}/seguimiento`,
      }
    })
    .filter((item): item is AssessmentsDashboardAttentionItem => item != null)

  const pendingReviews: AssessmentsDashboardReviewItem[] = reviewRaw
    .map((item) => {
      const mapped = mapDashboardItem(item)
      if (!mapped) return null
      return {
        assignmentId: mapped.assignmentId,
        candidateName: mapped.candidateName,
        vacancyTitle: mapped.vacancyTitle,
        testTitle: mapped.testTitle,
        href: `${PRUEBAS_HOME_HREF}/revision`,
      }
    })
    .filter((item): item is AssessmentsDashboardReviewItem => item != null)

  const recentActivity: AssessmentsDashboardActivityItem[] = recentRaw
    .map((item) => {
      const mapped = mapDashboardItem(item)
      if (!mapped) return null
      return {
        assignmentId: mapped.assignmentId,
        candidateName: mapped.candidateName,
        vacancyTitle: mapped.vacancyTitle,
        testTitle: mapped.testTitle,
        status: mapped.status,
        assignedAt: mapped.assignedAt,
        href: activityHref(mapped.status),
      }
    })
    .filter((item): item is AssessmentsDashboardActivityItem => item != null)

  const filtersActive = hasAssessmentsDashboardFilters(filters)

  return {
    counts,
    activitySeries,
    statusDistribution,
    dueSoon,
    pendingReviews,
    recentActivity,
    isEmpty: !filtersActive && counts.assigned === 0,
    isFilterEmpty: filtersActive && counts.assigned === 0,
  }
}

export async function fetchAssessmentsDashboard(
  filters: AssessmentsDashboardFilters = {},
): Promise<AssessmentsDashboardView> {
  const query = buildAssessmentsDashboardQuery(filters)
  const raw = await apiClient.get(`${DASHBOARD_PATH}${query}`)
  return normalizeAssessmentsDashboard(raw, filters)
}
