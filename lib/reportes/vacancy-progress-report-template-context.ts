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
import { escapeHtmlForTechnicalSheet } from "@/lib/technical-sheet/template-interpolate"

export const VACANCY_PROGRESS_REPORT_KEY = "vacancy-progress-by-client"

export interface BuildVacancyProgressReportContextInput {
  rows: ReportRuntimeRow[]
  totalCount: number
  generatedAt: string
  periodStart: string
  periodEnd: string
  clientName: string
}

const EM_DASH = "—"

function coerceVacancyRows(rows: ReportRuntimeRow[]): VacancyProgressByClientRow[] {
  return rows.filter((r) => r != null && typeof r === "object") as VacancyProgressByClientRow[]
}

function escapeCell(value: string): string {
  return escapeHtmlForTechnicalSheet(value)
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
interface FormattedVacancyRow {
  row: VacancyProgressByClientRow
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
  candidatesByStageHtml: string
}

function renderStagePillsHtml(
  map: Record<string, number> | null | undefined
): string {
  if (!map || typeof map !== "object") {
    return `<span class="stage-empty">Sin etapas registradas ${EM_DASH}</span>`
  }
  const entries = Object.entries(map)
    .filter(([, n]) => typeof n === "number" && n > 0)
    .sort((a, b) => b[1] - a[1])
  if (entries.length === 0) {
    return `<span class="stage-empty">Sin etapas registradas ${EM_DASH}</span>`
  }
  return entries
    .map(
      ([name, count]) =>
        `<span class="stage-pill"><span class="stage-pill-name">${escapeCell(name)}</span><span class="stage-pill-count">${formatCount(count)}</span></span>`
    )
    .join("")
}

function buildFormattedRow(row: VacancyProgressByClientRow): FormattedVacancyRow {
  const stageCounts = vacancyStageCounts(row)
  const progress = vacancyProgressPercentValue(row)
  const interview = stageCounts.interview ?? row.candidatesInInterview ?? 0
  const finalist = stageCounts.finalist ?? row.candidatesFinalist ?? 0
  const hired = stageCounts.hired ?? row.candidatesHired ?? 0

  return {
    row,
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
    candidatesByStageHtml: renderStagePillsHtml(row.candidatesByStage),
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

function renderClientDistributionRows(rows: VacancyProgressByClientRow[]): string {
  const aggregates = aggregateByClient(rows)
  if (aggregates.length === 0) {
    return `<tr><td colspan="5" class="center muted">Sin datos para los filtros aplicados.</td></tr>`
  }
  return aggregates
    .map(
      (c) => `<tr>
  <td><strong>${escapeCell(c.clientLabel)}</strong></td>
  <td class="center">${formatCount(c.vacancies)}</td>
  <td class="center">${formatCount(c.candidates)}</td>
  <td class="center">${formatCount(c.withAi)}</td>
  <td class="center">${formatCount(c.hired)}</td>
</tr>`
    )
    .join("")
}

function renderVacancyIndexRows(formatted: FormattedVacancyRow[]): string {
  if (formatted.length === 0) {
    return `<tr><td colspan="7" class="center muted">Sin vacantes en el periodo.</td></tr>`
  }
  return formatted
    .map(
      (f) => `<tr>
  <td>${escapeCell(f.clientLabel)}</td>
  <td>${escapeCell(f.vacancyTitleLabel)}</td>
  <td class="center">${escapeCell(f.vacancyStatusLabel)}</td>
  <td class="center">${escapeCell(f.openedAtLabel)}</td>
  <td class="center">${escapeCell(f.progressPercentLabel)}</td>
  <td class="center">${escapeCell(f.averagePreliminaryMatchScoreLabel)}</td>
  <td class="center">${escapeCell(f.totalCandidatesLabel)}</td>
</tr>`
    )
    .join("")
}

function renderVacancyDetailCards(formatted: FormattedVacancyRow[]): string {
  if (formatted.length === 0) {
    return `<p class="muted">No hay vacantes para mostrar con los filtros actuales.</p>`
  }
  return formatted
    .map(
      (f) => `<article class="vacancy-card">
  <header class="vacancy-card-header">
    <div>
      <h3 class="vacancy-title">${escapeCell(f.vacancyTitleLabel)}</h3>
      <p class="vacancy-subtitle">${escapeCell(f.clientLabel)}</p>
    </div>
    <div class="vacancy-status">
      <strong>Estado:</strong> ${escapeCell(f.vacancyStatusLabel)}
    </div>
  </header>

  <div class="vacancy-info-grid">
    <div class="vacancy-info-item">
      <span class="info-label">Apertura</span>
      <span class="info-value">${escapeCell(f.openedAtLabel)}</span>
    </div>
    <div class="vacancy-info-item">
      <span class="info-label">Cierre</span>
      <span class="info-value">${escapeCell(f.closedAtLabel)}</span>
    </div>
    <div class="vacancy-info-item">
      <span class="info-label">Candidatos</span>
      <span class="info-value">${escapeCell(f.totalCandidatesLabel)}</span>
    </div>
    <div class="vacancy-info-item">
      <span class="info-label">Días para cierre</span>
      <span class="info-value">${escapeCell(f.averageDaysToFillLabel)}</span>
    </div>
  </div>

  <div class="vacancy-metrics-grid">
    <div class="metric-mini-card">
      <div class="metric-mini-label">Candidatos</div>
      <div class="metric-mini-value">${escapeCell(f.totalCandidatesLabel)}</div>
    </div>
    <div class="metric-mini-card">
      <div class="metric-mini-label">Entrevista</div>
      <div class="metric-mini-value">${escapeCell(f.interviewLabel)}</div>
    </div>
    <div class="metric-mini-card">
      <div class="metric-mini-label">Finalistas</div>
      <div class="metric-mini-value">${escapeCell(f.finalistLabel)}</div>
    </div>
    <div class="metric-mini-card">
      <div class="metric-mini-label">Contratados</div>
      <div class="metric-mini-value">${escapeCell(f.hiredLabel)}</div>
    </div>
    <div class="metric-mini-card">
      <div class="metric-mini-label">Score IA</div>
      <div class="metric-mini-value">${escapeCell(f.averagePreliminaryMatchScoreLabel)}</div>
    </div>
  </div>

  <div class="ai-score-row">
    <div class="ai-score-cell">
      <span class="ai-score-label">Score IA mínimo</span>
      <span class="ai-score-value">${escapeCell(f.minPreliminaryMatchScoreLabel)}</span>
    </div>
    <div class="ai-score-cell">
      <span class="ai-score-label">Score IA promedio</span>
      <span class="ai-score-value">${escapeCell(f.averagePreliminaryMatchScoreLabel)}</span>
    </div>
    <div class="ai-score-cell">
      <span class="ai-score-label">Score IA máximo</span>
      <span class="ai-score-value">${escapeCell(f.maxPreliminaryMatchScoreLabel)}</span>
    </div>
  </div>

  <div class="progress-row">
    <div class="progress-label">
      <span>Avance del proceso</span>
      <span>${escapeCell(f.progressPercentLabel)}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style="width:${f.progressPercentSafe}%"></div>
    </div>
  </div>

  <div class="pipeline-stages">
    <div class="pipeline-stages-title">Pipeline por etapa</div>
    <div class="pipeline-stages-wrap">${f.candidatesByStageHtml}</div>
  </div>
</article>`
    )
    .join("")
}

function renderTechnicalRows(formatted: FormattedVacancyRow[]): string {
  if (formatted.length === 0) {
    return `<tr><td colspan="11" class="center muted">Sin filas técnicas.</td></tr>`
  }
  return formatted
    .map(
      (f) => `<tr>
  <td>${escapeCell(f.clientLabel)}</td>
  <td>${escapeCell(f.vacancyTitleLabel)}</td>
  <td class="center">${escapeCell(f.vacancyStatusLabel)}</td>
  <td class="center">${escapeCell(f.openedAtLabel)}</td>
  <td class="center">${escapeCell(f.closedAtLabel)}</td>
  <td class="center">${escapeCell(f.totalCandidatesLabel)}</td>
  <td class="center">${escapeCell(f.interviewLabel)}</td>
  <td class="center">${escapeCell(f.finalistLabel)}</td>
  <td class="center">${escapeCell(f.hiredLabel)}</td>
  <td class="center">${escapeCell(f.progressPercentLabel)}</td>
  <td class="center">${escapeCell(f.averagePreliminaryMatchScoreLabel)}</td>
</tr>`
    )
    .join("")
}

function renderInsightsHtml(rows: VacancyProgressByClientRow[]): string {
  const insights = buildExecutiveInsights(rows)
  const bullets = insights
    .filter((item) => !item.isEmpty || item.id === "zero-candidates")
    .slice(0, 4)
    .map(
      (item) =>
        `<li><strong>${escapeCell(item.title)}:</strong> ${escapeCell(item.description)} (${escapeCell(item.metric)})</li>`
    )

  if (bullets.length === 0) {
    return "<li>No hay hallazgos destacados para los filtros actuales.</li>"
  }
  return bullets.join("")
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
function renderTopVacancyHtml(summary: InsightSummary): string {
  return `<span class="top-vacancy-label">${escapeCell(summary.label)}</span><span class="top-vacancy-metric">${escapeCell(summary.metric)}</span>`
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

  const clientDistributionRows = renderClientDistributionRows(rows)
  const vacancyIndexRows = renderVacancyIndexRows(formattedRows)
  const vacancyDetailCards = renderVacancyDetailCards(formattedRows)
  const technicalRows = renderTechnicalRows(formattedRows)
  const insightsHtml = renderInsightsHtml(rows)

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

    topProgressVacancy: renderTopVacancyHtml(topProgress),
    topAiScoreVacancy: renderTopVacancyHtml(topAiScore),
    topCandidatesVacancy: renderTopVacancyHtml(topCandidates),
    topProgressVacancyLabel: topProgress.label,
    topProgressVacancyMetric: topProgress.metric,
    topAiScoreVacancyLabel: topAiScore.label,
    topAiScoreVacancyMetric: topAiScore.metric,
    topCandidatesVacancyLabel: topCandidates.label,
    topCandidatesVacancyMetric: topCandidates.metric,

    clientDistributionRows,
    vacancyIndexRows,
    vacancyDetailCards,
    technicalRows,
    insightsHtml,

    clientsRowsHtml: clientDistributionRows,
    vacancyIndexRowsHtml: vacancyIndexRows,
    vacancyDetailCardsHtml: vacancyDetailCards,
    technicalRowsHtml: technicalRows,

    clientName: input.clientName,
    dateFrom: input.periodStart,
    dateTo: input.periodEnd,
    rows,
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
