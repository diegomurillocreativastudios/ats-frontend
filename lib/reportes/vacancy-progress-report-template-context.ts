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
  formatDate,
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

function coerceVacancyRows(rows: ReportRuntimeRow[]): VacancyProgressByClientRow[] {
  return rows.filter((r) => r != null && typeof r === "object") as VacancyProgressByClientRow[]
}

function escapeCell(value: string): string {
  return escapeHtmlForTechnicalSheet(value)
}

function formatScoreDisplay(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—"
  return Number(value).toFixed(1)
}

function formatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "0"
  return formatExecutiveInt(value)
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

function renderClientsRowsHtml(rows: VacancyProgressByClientRow[]): string {
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

function renderVacancyIndexRowsHtml(rows: VacancyProgressByClientRow[]): string {
  if (rows.length === 0) {
    return `<tr><td colspan="7" class="center muted">Sin vacantes en el periodo.</td></tr>`
  }
  return rows
    .map((row) => {
      const progress = vacancyProgressPercentValue(row)
      const match = row.averagePreliminaryMatchScore
      return `<tr>
  <td>${escapeCell(vacancyClientLabel(row))}</td>
  <td>${escapeCell(String(row.vacancyTitle ?? "—"))}</td>
  <td class="center">${escapeCell(formatVacancyStatusSlug(row.vacancyStatus))}</td>
  <td class="center">${escapeCell(formatDate(row.openedAt))}</td>
  <td class="center">${formatCount(row.totalCandidates)}</td>
  <td class="center">${escapeCell(formatExecutivePercent(progress))}</td>
  <td class="center">${escapeCell(formatScoreDisplay(match))}</td>
</tr>`
    })
    .join("")
}

function renderPipelineRowsHtml(
  map: Record<string, number> | null | undefined,
  maxItems: number,
  offset = 0
): string {
  if (!map || typeof map !== "object") return ""
  const entries = Object.entries(map)
    .filter(([, n]) => typeof n === "number" && n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(offset, offset + maxItems)
  if (entries.length === 0) return ""
  return entries
    .map(
      ([name, count]) =>
        `<div class="pipeline-row"><span>${escapeCell(name)}</span><span>${formatCount(count)}</span></div>`
    )
    .join("")
}

function renderVacancyDetailCardsHtml(rows: VacancyProgressByClientRow[]): string {
  if (rows.length === 0) {
    return `<p class="muted">No hay vacantes para mostrar con los filtros actuales.</p>`
  }

  return rows
    .map((row) => {
      const progress = vacancyProgressPercentValue(row) ?? 0
      const progressWidth = Math.min(100, Math.max(0, progress))
      const sc = vacancyStageCounts(row)
      const stageMap = row.candidatesByStage
      const stageEntryCount = stageMap
        ? Object.values(stageMap).filter(
            (n) => typeof n === "number" && n > 0
          ).length
        : 0
      const pipelineLeft = stageMap ? renderPipelineRowsHtml(stageMap, 6, 0) : ""
      const pipelineRight =
        stageEntryCount > 6 ? renderPipelineRowsHtml(stageMap, 6, 6) : ""

      const interview = sc.interview ?? row.candidatesInInterview ?? 0
      const finalist = sc.finalist ?? row.candidatesFinalist ?? 0
      const hired = sc.hired ?? row.candidatesHired ?? 0

      const pipelineBlock =
        pipelineLeft || pipelineRight
          ? `<div class="pipeline-grid">
      <div class="pipeline-box">
        <div class="pipeline-title">Pipeline por etapa</div>
        ${pipelineLeft || '<div class="pipeline-row"><span class="muted">Sin etapas registradas</span><span>—</span></div>'}
      </div>
      <div class="pipeline-box">
        <div class="pipeline-title">Detalle adicional</div>
        ${pipelineRight || '<div class="pipeline-row"><span class="muted">Sin más etapas</span><span>—</span></div>'}
      </div>
    </div>`
          : ""

      return `<article class="vacancy-card">
  <header class="vacancy-card-header">
    <div>
      <h3 class="vacancy-title">${escapeCell(String(row.vacancyTitle ?? "Sin título"))}</h3>
      <p class="vacancy-subtitle">${escapeCell(vacancyClientLabel(row))}</p>
    </div>
    <div class="vacancy-status">
      <strong>Estado:</strong> ${escapeCell(formatVacancyStatusSlug(row.vacancyStatus))}
    </div>
  </header>

  <div class="vacancy-info-grid">
    <div class="vacancy-info-item">
      <span class="info-label">Apertura</span>
      <span class="info-value">${escapeCell(formatDate(row.openedAt))}</span>
    </div>
    <div class="vacancy-info-item">
      <span class="info-label">Cierre</span>
      <span class="info-value">${escapeCell(formatDate(row.closedAt))}</span>
    </div>
    <div class="vacancy-info-item">
      <span class="info-label">Candidatos</span>
      <span class="info-value">${formatCount(row.totalCandidates)}</span>
    </div>
    <div class="vacancy-info-item">
      <span class="info-label">Días para cierre</span>
      <span class="info-value">${formatCount(row.averageDaysToFill)}</span>
    </div>
  </div>

  <div class="vacancy-metrics-grid">
    <div class="metric-mini-card">
      <div class="metric-mini-label">Candidatos</div>
      <div class="metric-mini-value">${formatCount(row.totalCandidates)}</div>
    </div>
    <div class="metric-mini-card">
      <div class="metric-mini-label">Entrevista</div>
      <div class="metric-mini-value">${formatCount(interview)}</div>
    </div>
    <div class="metric-mini-card">
      <div class="metric-mini-label">Finalistas</div>
      <div class="metric-mini-value">${formatCount(finalist)}</div>
    </div>
    <div class="metric-mini-card">
      <div class="metric-mini-label">Contratados</div>
      <div class="metric-mini-value">${formatCount(hired)}</div>
    </div>
    <div class="metric-mini-card">
      <div class="metric-mini-label">Score IA</div>
      <div class="metric-mini-value">${escapeCell(formatScoreDisplay(row.averagePreliminaryMatchScore))}</div>
    </div>
  </div>

  <div class="progress-row">
    <div class="progress-label">
      <span>Avance del proceso</span>
      <span>${escapeCell(formatExecutivePercent(progress))}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style="width:${progressWidth}%"></div>
    </div>
  </div>
  ${pipelineBlock}
</article>`
    })
    .join("")
}

function renderTechnicalRowsHtml(rows: VacancyProgressByClientRow[]): string {
  if (rows.length === 0) {
    return `<tr><td colspan="11" class="center muted">Sin filas técnicas.</td></tr>`
  }
  return rows
    .map((row) => {
      const sc = vacancyStageCounts(row)
      const progress = vacancyProgressPercentValue(row)
      return `<tr>
  <td>${escapeCell(vacancyClientLabel(row))}</td>
  <td>${escapeCell(String(row.vacancyTitle ?? "—"))}</td>
  <td class="center">${escapeCell(formatVacancyStatusSlug(row.vacancyStatus))}</td>
  <td class="center">${escapeCell(formatDate(row.openedAt))}</td>
  <td class="center">${escapeCell(formatDate(row.closedAt))}</td>
  <td class="center">${formatCount(row.totalCandidates)}</td>
  <td class="center">${formatCount(sc.interview ?? row.candidatesInInterview)}</td>
  <td class="center">${formatCount(sc.finalist ?? row.candidatesFinalist)}</td>
  <td class="center">${formatCount(sc.hired ?? row.candidatesHired)}</td>
  <td class="center">${escapeCell(formatExecutivePercent(progress))}</td>
  <td class="center">${escapeCell(formatScoreDisplay(row.averagePreliminaryMatchScore))}</td>
</tr>`
    })
    .join("")
}

/**
 * Builds the full interpolation context for the vacancy-progress-by-client PDF template.
 */
export function buildVacancyProgressReportTemplateContext(
  input: BuildVacancyProgressReportContextInput
): Record<string, unknown> {
  const rows = coerceVacancyRows(input.rows)
  const kpis = computeAvanceVacantesDashboardKpis(rows, input.totalCount)

  const vacanciesWithCandidates = rows.filter(
    (r) => (typeof r.totalCandidates === "number" ? r.totalCandidates : 0) > 0
  ).length
  const vacanciesWithoutCandidates = rows.length - vacanciesWithCandidates

  const clientLabels = new Set(rows.map((r) => vacancyClientLabel(r)))

  const avgScore =
    kpis.avgPreliminaryMatchOnPage != null
      ? formatScoreDisplay(kpis.avgPreliminaryMatchOnPage)
      : "—"

  const insightsHtml = renderInsightsHtml(rows)
  const clientsRowsHtml = renderClientsRowsHtml(rows)
  const vacancyIndexRowsHtml = renderVacancyIndexRowsHtml(rows)
  const vacancyDetailCardsHtml = renderVacancyDetailCardsHtml(rows)
  const technicalRowsHtml = renderTechnicalRowsHtml(rows)

  return {
    generatedAt: input.generatedAt,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    totalCount: formatExecutiveInt(input.totalCount),
    totalVacancies: formatExecutiveInt(kpis.totalVacancies),
    openVacancies: formatExecutiveInt(kpis.openCount),
    totalClients: formatExecutiveInt(clientLabels.size),
    totalCandidates: formatExecutiveInt(kpis.totalCandidates),
    vacanciesWithCandidates: formatExecutiveInt(vacanciesWithCandidates),
    averagePreliminaryMatchScore: avgScore,
    candidatesWithPreliminaryAnalysis: formatExecutiveInt(
      kpis.sumPreliminaryAnalyzed
    ),
    candidatesInInterview: formatExecutiveInt(kpis.sumInterview),
    candidatesFinalist: formatExecutiveInt(kpis.sumFinalist),
    candidatesHired: formatExecutiveInt(kpis.sumHired),
    vacanciesWithoutCandidates: formatExecutiveInt(vacanciesWithoutCandidates),
    insightsHtml,
    clientsRowsHtml,
    vacancyIndexRowsHtml,
    vacancyDetailCardsHtml,
    technicalRowsHtml,
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
    periodStart: from ? formatIsoDateForPdf(from) : "—",
    periodEnd: to ? formatIsoDateForPdf(to) : "—",
  }
}

export function isVacancyProgressReportKey(reportKey: string): boolean {
  return reportKey.trim() === VACANCY_PROGRESS_REPORT_KEY
}
