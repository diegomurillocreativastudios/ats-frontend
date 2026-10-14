import type {
  AssignmentStatus,
  MockApplication,
  MockAssessmentTest,
  MockAssessmentVersion,
  MockAssignment,
  MockCandidateProfile,
  MockResult,
  MockVacancy,
} from "@/lib/pruebas/types"
import { PRUEBAS_HOME_HREF } from "@/lib/pruebas/portal-nav"

export type ReportKey =
  | "assignments-by-status"
  | "technical-scores"
  | "psychometric-dimensions"

export const REPORT_CATALOG_KEYS: readonly ReportKey[] = [
  "assignments-by-status",
  "technical-scores",
  "psychometric-dimensions",
] as const

export const DEFAULT_REPORT_KEY: ReportKey = "assignments-by-status"

export const ASSIGNMENT_STATUS_ORDER: readonly AssignmentStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "expired",
  "cancelled",
] as const

export interface ReportsFilters {
  vacancyId: string | null
  /** Inclusive start of assignedAt day (UTC YYYY-MM-DD or ISO). */
  assignedFrom: string | null
  /** Inclusive end of assignedAt day (UTC YYYY-MM-DD or ISO). */
  assignedTo: string | null
}

export interface AssignmentStatusReportRow {
  assignmentId: string
  candidateName: string
  vacancyId: string
  vacancyTitle: string
  testTitle: string
  status: AssignmentStatus
  assignedAt: string
}

export interface TechnicalScoreReportRow {
  assignmentId: string
  candidateName: string
  vacancyId: string
  vacancyTitle: string
  testTitle: string
  score: number
  maxScore: number
  assignedAt: string
}

export interface PsychometricDimensionReportRow {
  assignmentId: string
  candidateName: string
  vacancyId: string
  vacancyTitle: string
  dimension: string
  score: number
  assignedAt: string
}

export interface StatusCountPoint {
  status: AssignmentStatus
  count: number
}

export interface ChartPoint {
  name: string
  value: number
}

export interface RrhhTestsPanelRow {
  assignmentId: string
  candidateName: string
  testTitle: string
  status: AssignmentStatus
  href: string
}

export interface ReportsStoreSlice {
  assignments: readonly MockAssignment[]
  applications: readonly MockApplication[]
  candidates: readonly MockCandidateProfile[]
  vacancies: readonly MockVacancy[]
  tests: readonly MockAssessmentTest[]
  versions: readonly MockAssessmentVersion[]
  results: readonly MockResult[]
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

function matchesAssignedAtRange(
  assignedAt: string,
  filters: ReportsFilters,
): boolean {
  const assignedMs = Date.parse(assignedAt)
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

function resolveJoinedContext(input: {
  assignment: MockAssignment
  applications: readonly MockApplication[]
  candidates: readonly MockCandidateProfile[]
  vacancies: readonly MockVacancy[]
  tests: readonly MockAssessmentTest[]
  versions: readonly MockAssessmentVersion[]
}): {
  candidateName: string
  vacancyId: string
  vacancyTitle: string
  testTitle: string
} | null {
  const { assignment, applications, candidates, vacancies, tests, versions } =
    input
  const application = applications.find(
    (item) => item.id === assignment.applicationId,
  )
  if (!application) {
    return null
  }
  const candidate = candidates.find(
    (item) => item.id === application.candidateProfileId,
  )
  const vacancy = vacancies.find((item) => item.id === application.vacancyId)
  const version = versions.find((item) => item.id === assignment.testVersionId)
  const test = version
    ? tests.find((item) => item.id === version.testId)
    : undefined
  if (!candidate || !vacancy || !version || !test) {
    return null
  }
  return {
    candidateName: candidate.fullName,
    vacancyId: vacancy.id,
    vacancyTitle: vacancy.title,
    testTitle: test.title,
  }
}

/**
 * Safe return path for HR portal only: relative `/portal-rrhh/...` without
 * scheme, `//`, or backslashes. Decodes once before validating.
 */
export function parseSafeRrhhReturnTo(
  raw: string | null | undefined,
): string | null {
  if (raw == null || raw.trim() === "") {
    return null
  }
  let decoded: string
  try {
    decoded = decodeURIComponent(raw.trim())
  } catch {
    return null
  }
  if (
    decoded.includes("://") ||
    decoded.includes("//") ||
    decoded.includes("\\") ||
    decoded.includes("\0")
  ) {
    return null
  }
  if (!decoded.startsWith("/portal-rrhh/")) {
    return null
  }
  return decoded
}

export function buildAssignTestHref(returnPath: string): string {
  const params = new URLSearchParams()
  params.set("returnTo", returnPath)
  return `${PRUEBAS_HOME_HREF}/asignaciones?${params.toString()}`
}

export function buildAssignmentStatusReportRows(
  store: ReportsStoreSlice,
  filters: ReportsFilters,
): AssignmentStatusReportRow[] {
  const rows: AssignmentStatusReportRow[] = []

  for (const assignment of store.assignments) {
    const joined = resolveJoinedContext({
      assignment,
      applications: store.applications,
      candidates: store.candidates,
      vacancies: store.vacancies,
      tests: store.tests,
      versions: store.versions,
    })
    if (!joined) {
      continue
    }
    if (filters.vacancyId && joined.vacancyId !== filters.vacancyId) {
      continue
    }
    if (!matchesAssignedAtRange(assignment.assignedAt, filters)) {
      continue
    }
    rows.push({
      assignmentId: assignment.id,
      candidateName: joined.candidateName,
      vacancyId: joined.vacancyId,
      vacancyTitle: joined.vacancyTitle,
      testTitle: joined.testTitle,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
    })
  }

  return rows.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
}

export function countAssignmentStatuses(
  rows: readonly AssignmentStatusReportRow[],
): StatusCountPoint[] {
  const counts = new Map<AssignmentStatus, number>(
    ASSIGNMENT_STATUS_ORDER.map((status) => [status, 0]),
  )
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1)
  }
  return ASSIGNMENT_STATUS_ORDER.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }))
}

export function buildTechnicalScoreReportRows(
  store: ReportsStoreSlice,
  filters: ReportsFilters,
): TechnicalScoreReportRow[] {
  const rows: TechnicalScoreReportRow[] = []
  const assignmentById = new Map(
    store.assignments.map((assignment) => [assignment.id, assignment]),
  )

  for (const result of store.results) {
    if (typeof result.score !== "number" || typeof result.maxScore !== "number") {
      continue
    }
    const assignment = assignmentById.get(result.assignmentId)
    if (!assignment) {
      continue
    }
    const joined = resolveJoinedContext({
      assignment,
      applications: store.applications,
      candidates: store.candidates,
      vacancies: store.vacancies,
      tests: store.tests,
      versions: store.versions,
    })
    if (!joined) {
      continue
    }
    const version = store.versions.find(
      (item) => item.id === assignment.testVersionId,
    )
    const test = version
      ? store.tests.find((item) => item.id === version.testId)
      : undefined
    if (!test || test.kind !== "technical") {
      continue
    }
    if (filters.vacancyId && joined.vacancyId !== filters.vacancyId) {
      continue
    }
    if (!matchesAssignedAtRange(assignment.assignedAt, filters)) {
      continue
    }
    rows.push({
      assignmentId: assignment.id,
      candidateName: joined.candidateName,
      vacancyId: joined.vacancyId,
      vacancyTitle: joined.vacancyTitle,
      testTitle: joined.testTitle,
      score: result.score,
      maxScore: result.maxScore,
      assignedAt: assignment.assignedAt,
    })
  }

  return rows.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
}

export function buildPsychometricDimensionReportRows(
  store: ReportsStoreSlice,
  filters: ReportsFilters,
): PsychometricDimensionReportRow[] {
  const rows: PsychometricDimensionReportRow[] = []
  const assignmentById = new Map(
    store.assignments.map((assignment) => [assignment.id, assignment]),
  )

  for (const result of store.results) {
    if (!result.dimensionScores) {
      continue
    }
    const assignment = assignmentById.get(result.assignmentId)
    if (!assignment) {
      continue
    }
    const joined = resolveJoinedContext({
      assignment,
      applications: store.applications,
      candidates: store.candidates,
      vacancies: store.vacancies,
      tests: store.tests,
      versions: store.versions,
    })
    if (!joined) {
      continue
    }
    const version = store.versions.find(
      (item) => item.id === assignment.testVersionId,
    )
    const test = version
      ? store.tests.find((item) => item.id === version.testId)
      : undefined
    if (!test || test.kind !== "psychometric") {
      continue
    }
    if (filters.vacancyId && joined.vacancyId !== filters.vacancyId) {
      continue
    }
    if (!matchesAssignedAtRange(assignment.assignedAt, filters)) {
      continue
    }
    for (const [dimension, score] of Object.entries(result.dimensionScores)) {
      rows.push({
        assignmentId: assignment.id,
        candidateName: joined.candidateName,
        vacancyId: joined.vacancyId,
        vacancyTitle: joined.vacancyTitle,
        dimension,
        score,
        assignedAt: assignment.assignedAt,
      })
    }
  }

  return rows.sort((a, b) => {
    const byAssigned = b.assignedAt.localeCompare(a.assignedAt)
    if (byAssigned !== 0) {
      return byAssigned
    }
    return a.dimension.localeCompare(b.dimension)
  })
}

export function technicalScoreChartPoints(
  rows: readonly TechnicalScoreReportRow[],
): ChartPoint[] {
  return rows.map((row) => ({
    name: row.candidateName.split(" ")[0] ?? row.candidateName,
    value: row.score,
  }))
}

export function psychometricDimensionChartPoints(
  rows: readonly PsychometricDimensionReportRow[],
): ChartPoint[] {
  return rows.map((row) => ({
    name: row.dimension,
    value: row.score,
  }))
}

export function statusChartPoints(
  counts: readonly StatusCountPoint[],
  labelForStatus: (status: AssignmentStatus) => string,
): ChartPoint[] {
  return counts.map((point) => ({
    name: labelForStatus(point.status),
    value: point.count,
  }))
}

export function paginateReportRows<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): T[] {
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export function listVacancyOptionsFromStore(
  store: ReportsStoreSlice,
): { id: string; title: string }[] {
  const seen = new Map<string, string>()
  for (const assignment of store.assignments) {
    const joined = resolveJoinedContext({
      assignment,
      applications: store.applications,
      candidates: store.candidates,
      vacancies: store.vacancies,
      tests: store.tests,
      versions: store.versions,
    })
    if (joined && !seen.has(joined.vacancyId)) {
      seen.set(joined.vacancyId, joined.vacancyTitle)
    }
  }
  return [...seen.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** Seeded mock assignments for the read-only HR panel (no vacancy/candidate join). */
export function buildRrhhTestsPanelRows(
  store: ReportsStoreSlice,
): RrhhTestsPanelRow[] {
  const rows: RrhhTestsPanelRow[] = []

  for (const assignment of store.assignments) {
    const joined = resolveJoinedContext({
      assignment,
      applications: store.applications,
      candidates: store.candidates,
      vacancies: store.vacancies,
      tests: store.tests,
      versions: store.versions,
    })
    if (!joined) {
      continue
    }
    const href =
      assignment.status === "completed"
        ? `${PRUEBAS_HOME_HREF}/resultados/${assignment.id}`
        : `${PRUEBAS_HOME_HREF}/seguimiento`
    rows.push({
      assignmentId: assignment.id,
      candidateName: joined.candidateName,
      testTitle: joined.testTitle,
      status: assignment.status,
      href,
    })
  }

  return rows.sort((a, b) => a.candidateName.localeCompare(b.candidateName))
}
