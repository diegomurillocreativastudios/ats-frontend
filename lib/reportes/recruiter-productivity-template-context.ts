import type { ReportRuntimeRow } from "@/lib/api/recruiter-report-runtime"
import type { RecruiterProductivityRow } from "@/lib/api/recruiter-reports"
import {
  formatExecutiveInt,
  formatExecutivePercent,
} from "@/lib/reportes/executive-summary-metrics"

export const RECRUITER_PRODUCTIVITY_REPORT_KEY = "recruiter-productivity"

const EM_DASH = "—"

export interface BuildRecruiterProductivityContextInput {
  rows: Array<ReportRuntimeRow | RecruiterProductivityRow>
  totalCount: number
}

function coerceRows(
  rows: Array<ReportRuntimeRow | RecruiterProductivityRow>
): RecruiterProductivityRow[] {
  return rows.filter((r) => r != null && typeof r === "object") as RecruiterProductivityRow[]
}

function sumInt(rows: RecruiterProductivityRow[], pick: (r: RecruiterProductivityRow) => number | null | undefined): number {
  return rows.reduce((acc, row) => {
    const n = Number(pick(row))
    return acc + (Number.isFinite(n) ? n : 0)
  }, 0)
}

function averageNullable(
  rows: RecruiterProductivityRow[],
  pick: (r: RecruiterProductivityRow) => number | null | undefined
): number | null {
  const values = rows
    .map(pick)
    .filter((v): v is number => v != null && Number.isFinite(Number(v)))
    .map(Number)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function resolveRoleLabel(row: RecruiterProductivityRow): string {
  if (row.isAdmin && row.isRecruiter) return "Admin / Reclutador"
  if (row.isAdmin) return "Admin"
  if (row.isRecruiter) return "Reclutador"
  return EM_DASH
}

function formatDays(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return EM_DASH
  const n = Number(value)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return EM_DASH
  return formatExecutivePercent(value)
}

function formatScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return EM_DASH
  return Number(value).toFixed(1)
}

function pickTopPerformer(rows: RecruiterProductivityRow[]): RecruiterProductivityRow | null {
  if (rows.length === 0) return null
  return [...rows].sort((a, b) => {
    const hireDelta = (b.hires ?? 0) - (a.hires ?? 0)
    if (hireDelta !== 0) return hireDelta
    return (b.applicationsManaged ?? 0) - (a.applicationsManaged ?? 0)
  })[0] ?? null
}

/**
 * KPIs, ranking y filas formateadas para preview HTML y PDF schema del reporte
 * de productividad del reclutador.
 */
export function buildRecruiterProductivityTemplateContext(
  input: BuildRecruiterProductivityContextInput
): Record<string, unknown> {
  const rows = coerceRows(input.rows)
  const totalApplications = sumInt(rows, (r) => r.applicationsManaged)
  const totalHires = sumInt(rows, (r) => r.hires)
  const totalInterviewsScheduled = sumInt(rows, (r) => r.interviewsScheduled)
  const totalInterviewsCompleted = sumInt(rows, (r) => r.interviewsCompleted)
  const totalStageMoves = sumInt(rows, (r) => r.stageMoves)
  const totalOpenVacancies = sumInt(rows, (r) => r.openVacancies)
  const totalCandidatesAdded = sumInt(rows, (r) => r.candidatesAdded)

  const weightedConversion =
    totalApplications > 0
      ? Math.round((100 * totalHires) / totalApplications * 10) / 10
      : null

  const interviewCompletionRate =
    totalInterviewsScheduled > 0
      ? Math.round((100 * totalInterviewsCompleted) / totalInterviewsScheduled * 10) / 10
      : null

  const top = pickTopPerformer(rows)

  const recruiterRanking = [...rows]
    .sort((a, b) => {
      const hireDelta = (b.hires ?? 0) - (a.hires ?? 0)
      if (hireDelta !== 0) return hireDelta
      return (b.applicationsManaged ?? 0) - (a.applicationsManaged ?? 0)
    })
    .slice(0, 5)
    .map((r, index) => ({
      rank: String(index + 1),
      displayName: r.displayName?.trim() || EM_DASH,
      hires: formatExecutiveInt(r.hires ?? 0),
      applicationsManaged: formatExecutiveInt(r.applicationsManaged ?? 0),
      conversionPercent: formatPercent(r.conversionPercent),
    }))

  const detailRows = rows.map((r) => ({
    displayName: r.displayName?.trim() || EM_DASH,
    email: r.email?.trim() || EM_DASH,
    roleLabel: resolveRoleLabel(r),
    candidatesAdded: formatExecutiveInt(r.candidatesAdded ?? 0),
    applicationsManaged: formatExecutiveInt(r.applicationsManaged ?? 0),
    openVacancies: formatExecutiveInt(r.openVacancies ?? 0),
    interviewsScheduled: formatExecutiveInt(r.interviewsScheduled ?? 0),
    interviewsCompleted: formatExecutiveInt(r.interviewsCompleted ?? 0),
    stageMoves: formatExecutiveInt(r.stageMoves ?? 0),
    hires: formatExecutiveInt(r.hires ?? 0),
    averageTimeToHireDays: formatDays(r.averageTimeToHireDays),
    conversionPercent: formatPercent(r.conversionPercent),
    averagePreliminaryMatchScore: formatScore(r.averagePreliminaryMatchScore),
  }))

  return {
    recruitersTotal: formatExecutiveInt(input.totalCount),
    recruitersOnPage: formatExecutiveInt(rows.length),
    totalApplicationsManaged: formatExecutiveInt(totalApplications),
    totalHires: formatExecutiveInt(totalHires),
    totalInterviewsScheduled: formatExecutiveInt(totalInterviewsScheduled),
    totalInterviewsCompleted: formatExecutiveInt(totalInterviewsCompleted),
    totalStageMoves: formatExecutiveInt(totalStageMoves),
    totalOpenVacancies: formatExecutiveInt(totalOpenVacancies),
    totalCandidatesAdded: formatExecutiveInt(totalCandidatesAdded),
    averageConversionPercent: formatPercent(weightedConversion),
    interviewCompletionRate: formatPercent(interviewCompletionRate),
    averageTimeToHireDays: formatDays(averageNullable(rows, (r) => r.averageTimeToHireDays)),
    averagePreliminaryMatchScore: formatScore(
      averageNullable(rows, (r) => r.averagePreliminaryMatchScore)
    ),
    topRecruiterName: top?.displayName?.trim() || EM_DASH,
    topRecruiterHires: formatExecutiveInt(top?.hires ?? 0),
    topRecruiterApplications: formatExecutiveInt(top?.applicationsManaged ?? 0),
    recruiterRanking,
    detailRows,
  }
}
