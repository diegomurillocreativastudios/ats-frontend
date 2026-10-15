import { MOCK_NOW } from "@/lib/pruebas/mock-fixtures"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"
import type {
  AssessmentKind,
  AssignmentStatus,
  MockAssignment,
  MockPruebasStore,
  MockResult,
} from "@/lib/pruebas/types"

/** Inclusive window: expires after now and at most 14 days later. */
export const DUE_SOON_DAYS = 14

export interface DashboardFilters {
  companyId?: string | null
  vacancyId?: string | null
  kind?: AssessmentKind | null
  assignmentStatus?: AssignmentStatus | null
  /** Inclusive start of assignedAt day (UTC YYYY-MM-DD or ISO). */
  assignedFrom?: string | null
  /** Inclusive end of assignedAt day (UTC YYYY-MM-DD or ISO). */
  assignedTo?: string | null
}

export interface DashboardCounts {
  assigned: number
  pending: number
  inProgress: number
  completed: number
  expired: number
  pendingReview: number
}

export interface DashboardActivityPoint {
  date: string
  count: number
}

export interface DashboardStatusSlice {
  status: AssignmentStatus
  count: number
}

export interface DashboardAttentionItem {
  assignmentId: string
  candidateName: string
  vacancyTitle: string
  testTitle: string
  expiresAt: string
  href: string
}

export interface DashboardReviewItem {
  assignmentId: string
  candidateName: string
  vacancyTitle: string
  testTitle: string
  href: string
}

export interface DashboardActivityItem {
  assignmentId: string
  candidateName: string
  vacancyTitle: string
  testTitle: string
  status: AssignmentStatus
  assignedAt: string
  href: string
}

export interface DashboardFilterOption {
  id: string
  label: string
}

export interface DashboardVacancyOption extends DashboardFilterOption {
  companyId: string
}

export interface DashboardSnapshot {
  counts: DashboardCounts
  activitySeries: DashboardActivityPoint[]
  statusDistribution: DashboardStatusSlice[]
  dueSoon: DashboardAttentionItem[]
  pendingReviews: DashboardReviewItem[]
  recentActivity: DashboardActivityItem[]
  filterOptions: {
    companies: DashboardFilterOption[]
    vacancies: DashboardVacancyOption[]
  }
  /** True when the store has no demo companies (empty scenario). */
  isStoreEmpty: boolean
  /** True when filters are set and no assignment matches. */
  isFilterEmpty: boolean
}

interface JoinedAssignment {
  assignment: MockAssignment
  companyId: string
  companyName: string
  vacancyId: string
  vacancyTitle: string
  candidateName: string
  testTitle: string
  kind: AssessmentKind
  result: MockResult | undefined
}

const EMPTY_COUNTS: DashboardCounts = {
  assigned: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  expired: 0,
  pendingReview: 0,
}

function utcDayKey(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  return date.toISOString().slice(0, 10)
}

function dayBounds(dayOrIso: string): { startMs: number; endMs: number } | null {
  const key = dayOrIso.length >= 10 ? dayOrIso.slice(0, 10) : dayOrIso
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return null
  }
  const startMs = Date.parse(`${key}T00:00:00.000Z`)
  const endMs = Date.parse(`${key}T23:59:59.999Z`)
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return null
  }
  return { startMs, endMs }
}

function hasActiveFilters(filters: DashboardFilters): boolean {
  return Boolean(
    filters.companyId ||
      filters.vacancyId ||
      filters.kind ||
      filters.assignmentStatus ||
      filters.assignedFrom ||
      filters.assignedTo,
  )
}

function joinAssignments(store: MockPruebasStore): JoinedAssignment[] {
  const applicationById = new Map(
    store.applications.map((item) => [item.id, item]),
  )
  const vacancyById = new Map(store.vacancies.map((item) => [item.id, item]))
  const companyById = new Map(store.companies.map((item) => [item.id, item]))
  const candidateById = new Map(
    store.candidates.map((item) => [item.id, item]),
  )
  const versionById = new Map(store.versions.map((item) => [item.id, item]))
  const testById = new Map(store.tests.map((item) => [item.id, item]))
  const resultByAssignmentId = new Map(
    store.results.map((item) => [item.assignmentId, item]),
  )

  const joined: JoinedAssignment[] = []

  for (const assignment of store.assignments) {
    const application = applicationById.get(assignment.applicationId)
    if (!application) continue
    const vacancy = vacancyById.get(application.vacancyId)
    if (!vacancy) continue
    const company = companyById.get(vacancy.companyId)
    if (!company) continue
    const candidate = candidateById.get(application.candidateProfileId)
    if (!candidate) continue
    const version = versionById.get(assignment.testVersionId)
    if (!version) continue
    const test = testById.get(version.testId)
    if (!test) continue

    joined.push({
      assignment,
      companyId: company.id,
      companyName: company.name,
      vacancyId: vacancy.id,
      vacancyTitle: vacancy.title,
      candidateName: candidate.fullName,
      testTitle: test.title,
      kind: test.kind,
      result: resultByAssignmentId.get(assignment.id),
    })
  }

  return joined
}

function matchesFilters(
  row: JoinedAssignment,
  filters: DashboardFilters,
): boolean {
  if (filters.companyId && row.companyId !== filters.companyId) {
    return false
  }
  if (filters.vacancyId && row.vacancyId !== filters.vacancyId) {
    return false
  }
  if (filters.kind && row.kind !== filters.kind) {
    return false
  }
  if (
    filters.assignmentStatus &&
    row.assignment.status !== filters.assignmentStatus
  ) {
    return false
  }

  const assignedMs = Date.parse(row.assignment.assignedAt)
  if (Number.isNaN(assignedMs)) {
    return false
  }

  if (filters.assignedFrom) {
    const from = dayBounds(filters.assignedFrom)
    if (from && assignedMs < from.startMs) {
      return false
    }
  }
  if (filters.assignedTo) {
    const to = dayBounds(filters.assignedTo)
    if (to && assignedMs > to.endMs) {
      return false
    }
  }

  return true
}

function isDueSoon(assignment: MockAssignment, nowIso: string): boolean {
  if (
    assignment.status !== "pending" &&
    assignment.status !== "in_progress"
  ) {
    return false
  }
  const nowMs = Date.parse(nowIso)
  const expiresMs = Date.parse(assignment.expiresAt)
  if (Number.isNaN(nowMs) || Number.isNaN(expiresMs)) {
    return false
  }
  if (expiresMs <= nowMs) {
    return false
  }
  const windowEndMs = nowMs + DUE_SOON_DAYS * 24 * 60 * 60 * 1000
  return expiresMs <= windowEndMs
}

function activityHref(status: AssignmentStatus): string {
  if (status === "completed") {
    return `${PRUEBAS_HOME_HREF}/resultados`
  }
  return `${PRUEBAS_HOME_HREF}/seguimiento`
}

function buildCounts(rows: JoinedAssignment[]): DashboardCounts {
  const counts: DashboardCounts = { ...EMPTY_COUNTS }
  counts.assigned = rows.length
  for (const row of rows) {
    switch (row.assignment.status) {
      case "pending":
        counts.pending += 1
        break
      case "in_progress":
        counts.inProgress += 1
        break
      case "completed":
        counts.completed += 1
        break
      case "expired":
        counts.expired += 1
        break
      default:
        break
    }
    if (row.result?.reviewStatus === "pending") {
      counts.pendingReview += 1
    }
  }
  return counts
}

function buildActivitySeries(rows: JoinedAssignment[]): DashboardActivityPoint[] {
  const byDay = new Map<string, number>()
  for (const row of rows) {
    const day = utcDayKey(row.assignment.assignedAt)
    if (!day) continue
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

function buildStatusDistribution(
  rows: JoinedAssignment[],
): DashboardStatusSlice[] {
  const byStatus = new Map<AssignmentStatus, number>()
  for (const row of rows) {
    const status = row.assignment.status
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
  }
  return [...byStatus.entries()]
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => a.status.localeCompare(b.status))
}

/**
 * Pure dashboard aggregation over a mock store. No I/O, no React.
 */
export function buildDashboard(
  store: MockPruebasStore,
  filters: DashboardFilters = {},
  nowIso: string = MOCK_NOW,
): DashboardSnapshot {
  const isStoreEmpty =
    store.companies.length === 0 &&
    store.assignments.length === 0 &&
    store.tests.length === 0

  const allJoined = joinAssignments(store)
  const filtered = allJoined.filter((row) => matchesFilters(row, filters))
  const filtersActive = hasActiveFilters(filters)

  const dueSoon: DashboardAttentionItem[] = filtered
    .filter((row) => isDueSoon(row.assignment, nowIso))
    .sort((a, b) =>
      a.assignment.expiresAt.localeCompare(b.assignment.expiresAt),
    )
    .map((row) => ({
      assignmentId: row.assignment.id,
      candidateName: row.candidateName,
      vacancyTitle: row.vacancyTitle,
      testTitle: row.testTitle,
      expiresAt: row.assignment.expiresAt,
      href: `${PRUEBAS_HOME_HREF}/seguimiento`,
    }))

  const pendingReviews: DashboardReviewItem[] = filtered
    .filter((row) => row.result?.reviewStatus === "pending")
    .map((row) => ({
      assignmentId: row.assignment.id,
      candidateName: row.candidateName,
      vacancyTitle: row.vacancyTitle,
      testTitle: row.testTitle,
      href: `${PRUEBAS_HOME_HREF}/revision`,
    }))

  const recentActivity: DashboardActivityItem[] = [...filtered]
    .sort((a, b) =>
      b.assignment.assignedAt.localeCompare(a.assignment.assignedAt),
    )
    .slice(0, 8)
    .map((row) => ({
      assignmentId: row.assignment.id,
      candidateName: row.candidateName,
      vacancyTitle: row.vacancyTitle,
      testTitle: row.testTitle,
      status: row.assignment.status,
      assignedAt: row.assignment.assignedAt,
      href: activityHref(row.assignment.status),
    }))

  const companyOptions = store.companies
    .map((company) => ({ id: company.id, label: company.name }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const vacancyOptions = store.vacancies
    .map((vacancy) => ({
      id: vacancy.id,
      label: vacancy.title,
      companyId: vacancy.companyId,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return {
    counts: buildCounts(filtered),
    activitySeries: buildActivitySeries(filtered),
    statusDistribution: buildStatusDistribution(filtered),
    dueSoon,
    pendingReviews,
    recentActivity,
    filterOptions: {
      companies: companyOptions,
      vacancies: vacancyOptions,
    },
    isStoreEmpty,
    isFilterEmpty: filtersActive && filtered.length === 0,
  }
}
