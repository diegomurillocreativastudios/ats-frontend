import type { ReportRuntimeRow } from "@/lib/api/recruiter-report-runtime"
import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import {
  formatExecutiveInt,
  formatExecutivePercent,
  formatIsoDateForPdf,
} from "@/lib/reportes/executive-summary-metrics"
import {
  buildExecutiveInsights,
  computeAvanceVacantesDashboardKpis,
} from "@/lib/reportes-avance-vacantes-helpers"
import { formatVacancyStatusSlug } from "@/lib/reportes-display"
import {
  vacancyClientLabel,
  vacancyProgressPercentValue,
  vacancyStageCounts,
} from "@/lib/reportes-metrics"

export const VACANCY_PROGRESS_REPORT_KEY = "vacancy-progress-by-client"

export interface BuildVacancyProgressReportContextInput {
  rows: Array<ReportRuntimeRow | VacancyProgressByClientRow>
  totalCount: number
  generatedAt: string
  periodStart: string
  periodEnd: string
  clientName: string
}

const EM_DASH = "—"

function coerceVacancyRows(
  rows: Array<ReportRuntimeRow | VacancyProgressByClientRow>
): VacancyProgressByClientRow[] {
  return rows.filter((r) => r != null && typeof r === "object") as VacancyProgressByClientRow[]
}

/**
 * Formats a date string in Spanish long format. Returns em-dash when null/empty.
 */
function formatSpanishDate(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return EM_DASH
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(d)
}

function formatScoreLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return EM_DASH
  return Number(value).toFixed(1)
}

function formatDaysLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return EM_DASH
  return formatExecutiveInt(Math.round(Number(value)))
}

function formatPercentLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return EM_DASH
  return formatExecutivePercent(value)
}

function progressPercentSafe(value: number | null | undefined): number {
  if (value == null || Number.isNaN(Number(value))) return 0
  const n = Number(value)
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

function formatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "0"
  return formatExecutiveInt(value)
}

/**
 * Pre-formatted view of a row used by the row-rendering helpers. Avoids
 * leaking the raw row schema into HTML templates and prevents `—` placeholders
 * from being missed when a value is `null`/`undefined`.
 */
interface FormattedVacancyRow extends VacancyProgressByClientRow {
  clientLabel: string
  vacancyTitleLabel: string
  vacancyStatusLabel: string
  openedAtLabel: string
  closedAtLabel: string
  totalCandidatesLabel: string
  interviewLabel: string
  finalistLabel: string
  hiredLabel: string
  progressPercentLabel: string
  progressPercentSafe: number
  averagePreliminaryMatchScoreLabel: string
  minPreliminaryMatchScoreLabel: string
  maxPreliminaryMatchScoreLabel: string
  averageDaysToFillLabel: string
  candidatesByStageEntries: Array<{ stageName: string; stageCount: string }>
  hasCandidatesByStage: boolean
}

function buildStageEntries(
  map: Record<string, number> | null | undefined
): Array<{ stageName: string; stageCount: string }> {
  if (!map || typeof map !== "object") return []
  return Object.entries(map)
    .filter(([, n]) => typeof n === "number" && n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      stageName: name,
      stageCount: formatCount(count),
    }))
}

function buildFormattedRow(row: VacancyProgressByClientRow): FormattedVacancyRow {
  const stageCounts = vacancyStageCounts(row)
  const progress = vacancyProgressPercentValue(row)
  const interview = stageCounts.interview ?? row.candidatesInInterview ?? 0
  const finalist = stageCounts.finalist ?? row.candidatesFinalist ?? 0
  const hired = stageCounts.hired ?? row.candidatesHired ?? 0
  const stageEntries = buildStageEntries(row.candidatesByStage)

  return {
    ...row,
    clientLabel: vacancyClientLabel(row),
    vacancyTitleLabel: String(row.vacancyTitle ?? EM_DASH).trim() || EM_DASH,
    vacancyStatusLabel: formatVacancyStatusSlug(row.vacancyStatus),
    openedAtLabel: formatSpanishDate(row.openedAt),
    closedAtLabel: formatSpanishDate(row.closedAt),
    totalCandidatesLabel: formatCount(row.totalCandidates),
    interviewLabel: formatCount(interview),
    finalistLabel: formatCount(finalist),
    hiredLabel: formatCount(hired),
    progressPercentLabel: formatPercentLabel(progress),
    progressPercentSafe: progressPercentSafe(progress),
    averagePreliminaryMatchScoreLabel: formatScoreLabel(
      row.averagePreliminaryMatchScore
    ),
    minPreliminaryMatchScoreLabel: formatScoreLabel(
      row.minPreliminaryMatchScore
    ),
    maxPreliminaryMatchScoreLabel: formatScoreLabel(
      row.maxPreliminaryMatchScore
    ),
    averageDaysToFillLabel: formatDaysLabel(row.averageDaysToFill),
    candidatesByStageEntries: stageEntries,
    hasCandidatesByStage: stageEntries.length > 0,
  }
}

interface ClientAggregate {
  clientLabel: string
  vacancies: number
  candidates: number
  withAi: number
  hired: number
}

function aggregateByClient(rows: VacancyProgressByClientRow[]): ClientAggregate[] {
  const map = new Map<string, ClientAggregate>()
  for (const row of rows) {
    const label = vacancyClientLabel(row)
    const cur = map.get(label) ?? {
      clientLabel: label,
      vacancies: 0,
      candidates: 0,
      withAi: 0,
      hired: 0,
    }
    cur.vacancies += 1
    const tc = row.totalCandidates
    if (typeof tc === "number" && !Number.isNaN(tc)) cur.candidates += tc
    const ai = row.candidatesWithPreliminaryAnalysis
    if (typeof ai === "number" && !Number.isNaN(ai)) cur.withAi += ai
    const sc = vacancyStageCounts(row)
    const hired =
      typeof sc.hired === "number"
        ? sc.hired
        : typeof row.candidatesHired === "number"
          ? row.candidatesHired
          : 0
    cur.hired += hired
    map.set(label, cur)
  }
  return [...map.values()].sort((a, b) =>
    a.clientLabel.localeCompare(b.clientLabel, "es")
  )
}

interface ClientDistributionRow {
  clientName: string
  vacancies: string
  candidates: string
  candidatesWithAi: string
  hired: string
}

function buildClientDistribution(rows: VacancyProgressByClientRow[]): ClientDistributionRow[] {
  const aggregates = aggregateByClient(rows)
  return aggregates.map((c) => ({
    clientName: c.clientLabel,
    vacancies: formatCount(c.vacancies),
    candidates: formatCount(c.candidates),
    candidatesWithAi: formatCount(c.withAi),
    hired: formatCount(c.hired),
  }))
}

interface VacancyIndexRow {
  clientName: string
  vacancyTitle: string
  vacancyStatusLabel: string
  openedAtLabel: string
  progressPercentLabel: string
  averagePreliminaryMatchScoreLabel: string
  totalCandidatesLabel: string
}

function buildVacancyIndexRows(
  formatted: FormattedVacancyRow[]
): VacancyIndexRow[] {
  return formatted.map((f) => ({
    clientName: f.clientLabel,
    vacancyTitle: f.vacancyTitleLabel,
    vacancyStatusLabel: f.vacancyStatusLabel,
    openedAtLabel: f.openedAtLabel,
    progressPercentLabel: f.progressPercentLabel,
    averagePreliminaryMatchScoreLabel: f.averagePreliminaryMatchScoreLabel,
    totalCandidatesLabel: f.totalCandidatesLabel,
  }))
}

interface TechnicalRow {
  clientName: string
  vacancyTitle: string
  vacancyStatusLabel: string
  openedAtLabel: string
  closedAtLabel: string
  totalCandidatesLabel: string
  interviewLabel: string
  finalistLabel: string
  hiredLabel: string
  progressPercentLabel: string
  averagePreliminaryMatchScoreLabel: string
}

function buildTechnicalRows(formatted: FormattedVacancyRow[]): TechnicalRow[] {
  return formatted.map((f) => ({
    clientName: f.clientLabel,
    vacancyTitle: f.vacancyTitleLabel,
    vacancyStatusLabel: f.vacancyStatusLabel,
    openedAtLabel: f.openedAtLabel,
    closedAtLabel: f.closedAtLabel,
    totalCandidatesLabel: f.totalCandidatesLabel,
    interviewLabel: f.interviewLabel,
    finalistLabel: f.finalistLabel,
    hiredLabel: f.hiredLabel,
    progressPercentLabel: f.progressPercentLabel,
    averagePreliminaryMatchScoreLabel: f.averagePreliminaryMatchScoreLabel,
  }))
}

interface InsightSummary {
  label: string
  metric: string
}

function pickInsight(
  rows: VacancyProgressByClientRow[],
  id: "max-progress" | "best-match" | "most-candidates"
): InsightSummary {
  const insights = buildExecutiveInsights(rows)
  const found = insights.find((i) => i.id === id)
  if (!found || found.isEmpty) return { label: EM_DASH, metric: EM_DASH }
  return { label: found.description, metric: found.metric }
}

/**
 * Returns a compact HTML snippet describing a "top" vacancy (label + metric badge).
 */
function formatInsightSummary(summary: InsightSummary): string {
  if (!summary.label || summary.label === EM_DASH) return EM_DASH
  return `${summary.label} (${summary.metric})`
}

function resolvePeriodLabel(periodStart: string, periodEnd: string): string {
  const left = periodStart.trim() === "" ? EM_DASH : periodStart
  const right = periodEnd.trim() === "" ? EM_DASH : periodEnd
  if (left === EM_DASH && right === EM_DASH) return EM_DASH
  return `${left} ${EM_DASH} ${right}`
}

/**
 * Builds the full interpolation context for the vacancy-progress-by-client PDF template.
 * The template engine does not process `{{#if}}` or `{{#each}}` — therefore every
 * dynamic block (rows, cards, highlights) is fully rendered to HTML here and exposed
 * as a single string placeholder.
 */
export function buildVacancyProgressReportTemplateContext(
  input: BuildVacancyProgressReportContextInput
): Record<string, unknown> {
  const rows = coerceVacancyRows(input.rows)
  const kpis = computeAvanceVacantesDashboardKpis(rows, input.totalCount)
  const formattedRows = rows.map(buildFormattedRow)

  const vacanciesWithCandidates = rows.filter(
    (r) => (typeof r.totalCandidates === "number" ? r.totalCandidates : 0) > 0
  ).length
  const vacanciesWithoutCandidates = rows.length - vacanciesWithCandidates

  const clientLabels = new Set(rows.map((r) => vacancyClientLabel(r)))

  const averageAiScore =
    kpis.avgPreliminaryMatchOnPage != null
      ? formatScoreLabel(kpis.avgPreliminaryMatchOnPage)
      : EM_DASH

  const clientDistribution = buildClientDistribution(rows)
  const vacancyIndexRows = buildVacancyIndexRows(formattedRows)
  const technicalRows = buildTechnicalRows(formattedRows)

  const topProgress = pickInsight(rows, "max-progress")
  const topAiScore = pickInsight(rows, "best-match")
  const topCandidates = pickInsight(rows, "most-candidates")

  const periodLabel = resolvePeriodLabel(input.periodStart, input.periodEnd)

  const totalVacancies = formatExecutiveInt(kpis.totalVacancies)
  const openVacancies = formatExecutiveInt(kpis.openCount)
  const totalClients = formatExecutiveInt(clientLabels.size)
  const totalCandidates = formatExecutiveInt(kpis.totalCandidates)
  const totalInInterview = formatExecutiveInt(kpis.sumInterview)
  const totalFinalists = formatExecutiveInt(kpis.sumFinalist)
  const totalHired = formatExecutiveInt(kpis.sumHired)
  const candidatesWithAiAnalysis = formatExecutiveInt(kpis.sumPreliminaryAnalyzed)

  return {
    generatedAt: input.generatedAt,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    periodLabel,
    totalCount: formatExecutiveInt(input.totalCount),
    totalVacancies,
    openVacancies,
    totalClients,
    totalCandidates,
    vacanciesWithCandidates: formatExecutiveInt(vacanciesWithCandidates),
    vacanciesWithoutCandidates: formatExecutiveInt(vacanciesWithoutCandidates),
    averageAiScore,
    candidatesWithAiAnalysis,
    totalInInterview,
    totalFinalists,
    totalHired,

    averagePreliminaryMatchScore: averageAiScore,
    candidatesWithPreliminaryAnalysis: candidatesWithAiAnalysis,
    candidatesInInterview: totalInInterview,
    candidatesFinalist: totalFinalists,
    candidatesHired: totalHired,

    topProgressVacancy: formatInsightSummary(topProgress),
    topAiScoreVacancy: formatInsightSummary(topAiScore),
    topCandidatesVacancy: formatInsightSummary(topCandidates),
    topProgressVacancyLabel: topProgress.label,
    topProgressVacancyMetric: topProgress.metric,
    topAiScoreVacancyLabel: topAiScore.label,
    topAiScoreVacancyMetric: topAiScore.metric,
    topCandidatesVacancyLabel: topCandidates.label,
    topCandidatesVacancyMetric: topCandidates.metric,

    clientDistribution,
    vacancyIndexRows,
    technicalRows,

    clientName: input.clientName,
    dateFrom: input.periodStart,
    dateTo: input.periodEnd,
    rows: formattedRows,
    rowCount: input.totalCount,
  }
}

export function resolveVacancyProgressPeriodLabel(
  dateFrom: string,
  dateTo: string
): { periodStart: string; periodEnd: string } {
  const from = dateFrom.trim()
  const to = dateTo.trim()
  return {
    periodStart: from ? formatIsoDateForPdf(from) : EM_DASH,
    periodEnd: to ? formatIsoDateForPdf(to) : EM_DASH,
  }
}

export function isVacancyProgressReportKey(reportKey: string): boolean {
  return reportKey.trim() === VACANCY_PROGRESS_REPORT_KEY
}
