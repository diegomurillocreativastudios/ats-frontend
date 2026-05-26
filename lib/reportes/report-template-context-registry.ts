import type { ReportRuntimeRow } from "@/lib/api/recruiter-report-runtime"
import type {
  CandidateStatusByStageRow,
  PreliminaryMatchScoreRow,
  RecruitmentSourceRow,
  TechnicalEvaluationRow,
  TimeToHireKpiAiComparison,
  TimeToHireKpiAiMetric,
  TimeToHireKpiAiProcess,
  RecruiterProductivityRow,
  SalaryExpectationRow,
  SalaryExpectationsSummary,
  TimeToHireKpiRow,
  TimeToHireKpiSummary,
  VacancyProgressByClientRow,
} from "@/lib/api/recruiter-reports"
import {
  formatExecutiveInt,
  formatExecutivePercent,
  formatIsoDateForPdf,
} from "@/lib/reportes/executive-summary-metrics"
import {
  getAverageConversion,
  getBestSource,
  getTotalCandidates as getSourceTotalCandidates,
  getTotalFinalists as getSourceTotalFinalists,
  getTotalHires as getSourceTotalHires,
  getTotalInterviewed as getSourceTotalInterviewed,
  getTotalPreselected as getSourceTotalPreselected,
  formatPercent as formatSourcePercent,
  normalizeSourceLabel,
} from "@/lib/reportes-fuentes-reclutamiento-helpers"
import {
  calculateAverageScore,
  candidateDisplayName,
  candidateEmailDisplay,
  countMatchLevelEquals,
  groupByMatchLevel,
  groupByVacancyAverage,
  latestAnalysisFormatted,
  normalizeMatchLevel,
  rowAnalysisIso,
  stageDisplayLabel,
} from "@/lib/reportes-preliminary-match-helpers"
import {
  computeTechnicalEvaluationKpis,
  parseTechnicalScorePercent,
  technicalEvaluationBucket,
} from "@/lib/reportes-metrics"
import { formatReportDate } from "@/lib/reportes-display"
import {
  candidateDaysSinceLastMove,
  candidateStageLabel,
  countCandidatesByStageOnPage,
  displayCompanyOrClientLabel,
  preliminaryMatchScoreValue,
} from "@/lib/reportes-metrics"
import { buildRecruiterProductivityTemplateContext } from "@/lib/reportes/recruiter-productivity-template-context"
import { buildSalaryExpectationsTemplateContext } from "@/lib/reportes/salary-expectations-template-context"
import {
  buildVacancyProgressReportTemplateContext,
  resolveVacancyProgressPeriodLabel,
} from "@/lib/reportes/vacancy-progress-report-template-context"
import {
  getValueAtKey,
  resolveReportColumns,
  type ReportColumn,
} from "@/lib/reportes/report-data-registry"

const EM_DASH = "—"

/** Report keys con pipeline schema + PDFKit (mismo flujo que vacancy-progress-by-client). */
export const SCHEMA_REPORT_KEYS = [
  "vacancy-progress-by-client",
  "candidate-status-by-stage",
  "technical-evaluations",
  "recruitment-sources",
  "preliminary-match-scores",
  "time-to-hire-kpi",
  "recruiter-productivity",
  "salary-expectations",
] as const

export type SchemaReportKey = (typeof SCHEMA_REPORT_KEYS)[number]

export function supportsSchemaReportPipeline(reportKey: string): boolean {
  const key = reportKey.trim()
  return (SCHEMA_REPORT_KEYS as readonly string[]).includes(key)
}

export interface BuildReportTemplateContextInput {
  reportKey: string
  reportName: string
  reportDescription?: string
  rows: ReportRuntimeRow[]
  totalCount: number
  appliedFilters: Record<string, string>
  clientName: string
  generatedAt: string
  /**
   * Campos adicionales del payload del backend distintos de `rows`/`totalCount`
   * (por ejemplo `summary` o `aiComparison`). Los builders específicos pueden
   * leerlos para hidratar KPIs precomputados.
   */
  extras?: Record<string, unknown> | null
}

function resolvePeriod(appliedFilters: Record<string, string>) {
  const dateFrom = String(appliedFilters.dateFrom ?? "")
  const dateTo = String(appliedFilters.dateTo ?? "")
  return resolveVacancyProgressPeriodLabel(dateFrom, dateTo)
}

function formatColumnValue(
  col: ReportColumn,
  row: ReportRuntimeRow
): string {
  const raw = getValueAtKey(row, col.key)
  if (col.format) {
    const rendered = col.format(raw, row)
    if (rendered == null || rendered === "") return EM_DASH
    return String(rendered)
  }
  if (raw == null || raw === "") return EM_DASH
  return String(raw)
}

function buildRegistryTableRows(
  reportKey: string,
  rows: ReportRuntimeRow[]
): Array<Record<string, string>> {
  const sample = rows[0]
  const columns = resolveReportColumns(reportKey, sample)
  return rows.map((row) => {
    const out: Record<string, string> = {}
    for (const col of columns) {
      out[col.key] = formatColumnValue(col, row)
    }
    return out
  })
}

function buildBaseContext(
  input: BuildReportTemplateContextInput
): Record<string, unknown> {
  const period = resolvePeriod(input.appliedFilters)
  const tableRows = buildRegistryTableRows(input.reportKey, input.rows)

  return {
    report: {
      name: input.reportName,
      reportKey: input.reportKey,
      description: input.reportDescription ?? "",
    },
    filters: { ...input.appliedFilters, clientName: input.clientName },
    rows: input.rows,
    tableRows,
    totalCount: formatExecutiveInt(input.totalCount),
    rowCount: input.totalCount,
    generatedAt: input.generatedAt,
    clientName: input.clientName,
    dateFrom: String(input.appliedFilters.dateFrom ?? ""),
    dateTo: String(input.appliedFilters.dateTo ?? ""),
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    periodLabel:
      period.periodStart === EM_DASH && period.periodEnd === EM_DASH
        ? EM_DASH
        : `${period.periodStart} ${EM_DASH} ${period.periodEnd}`,
    logoUrl: "",
  }
}

function buildCandidateStatusContext(
  input: BuildReportTemplateContextInput
): Record<string, unknown> {
  const base = buildBaseContext(input)
  const rows = input.rows as CandidateStatusByStageRow[]
  const stageCounts = countCandidatesByStageOnPage(rows)
  const pageTotal = rows.length
  const effectiveTotal = input.totalCount > 0 ? input.totalCount : pageTotal
  const stages = stageCounts.map((s) => ({
    name: s.stageName,
    count: formatExecutiveInt(s.count),
    percent: formatExecutivePercent(
      effectiveTotal > 0 ? (s.count / effectiveTotal) * 100 : 0
    ),
  }))
  const dominant = stages[0]

  const detailRows = rows.map((r) => {
    const days =
      r.daysInStage != null && !Number.isNaN(Number(r.daysInStage))
        ? String(r.daysInStage)
        : (() => {
            const d = candidateDaysSinceLastMove(r)
            return d == null ? "" : String(d)
          })()
    return {
      candidateName: r.candidateName ?? EM_DASH,
      vacancyTitle: r.vacancyTitle ?? EM_DASH,
      clientName: displayCompanyOrClientLabel(r.clientName, r.companyName),
      stageName: candidateStageLabel(r),
      daysInStage: days || EM_DASH,
      status: r.pipelineStatus ?? r.applicationStatus ?? EM_DASH,
      lastMovedAt: formatReportDate(r.lastMovedAt),
      responsible: r.ownerName ?? r.recruiterName ?? EM_DASH,
    }
  })

  return {
    ...base,
    totalCandidates: formatExecutiveInt(effectiveTotal),
    stagesWithCandidates: formatExecutiveInt(stages.length),
    dominantStageName: dominant?.name ?? EM_DASH,
    dominantStagePercent: dominant?.percent ?? EM_DASH,
    stageDistribution: stages,
    detailRows,
  }
}

function technicalOutcomeLabel(r: TechnicalEvaluationRow): string {
  return (r.scoreOrOutcome ?? r.status ?? r.outcome ?? EM_DASH).trim() || EM_DASH
}

function buildTechnicalEvaluationsContext(
  input: BuildReportTemplateContextInput
): Record<string, unknown> {
  const base = buildBaseContext(input)
  const rows = input.rows as TechnicalEvaluationRow[]
  const kpis = computeTechnicalEvaluationKpis(rows, input.totalCount)

  const detailRows = rows.map((r) => {
    const score = parseTechnicalScorePercent(r)
    return {
      candidateName: r.candidateName ?? EM_DASH,
      vacancyTitle: r.vacancyTitle ?? EM_DASH,
      clientName: displayCompanyOrClientLabel(r.clientName, r.companyName),
      testName: r.evaluationTitle ?? r.testName ?? EM_DASH,
      scorePercent: score == null ? EM_DASH : `${score.toFixed(0)}%`,
      outcome: technicalOutcomeLabel(r),
      difficulty: r.difficultyLevel ?? EM_DASH,
      aiRecommendation: r.aiRecommendation ?? EM_DASH,
      sentAt: formatReportDate(r.sentAt),
      completedAt: formatReportDate(r.completedAt ?? r.evaluatedAt),
      evaluatorName: r.evaluatorName ?? EM_DASH,
      bucket: technicalEvaluationBucket(r),
    }
  })

  const distribution = [
    { label: "Aprobadas", value: formatExecutiveInt(kpis.approved) },
    { label: "En revisión", value: formatExecutiveInt(kpis.review) },
    { label: "Reprobadas", value: formatExecutiveInt(kpis.failed) },
    { label: "Pendientes", value: formatExecutiveInt(kpis.pending) },
  ]

  return {
    ...base,
    evaluationsTotal: formatExecutiveInt(kpis.totalUnderFilter),
    approvedCount: formatExecutiveInt(kpis.approved),
    reviewCount: formatExecutiveInt(kpis.review),
    failedCount: formatExecutiveInt(kpis.failed),
    pendingCount: formatExecutiveInt(kpis.pending),
    averageScore:
      kpis.avgScore == null ? EM_DASH : formatExecutivePercent(kpis.avgScore),
    withNumericScore: formatExecutiveInt(kpis.withNumericScore),
    outcomeDistribution: distribution,
    detailRows,
  }
}

function buildRecruitmentSourcesContext(
  input: BuildReportTemplateContextInput
): Record<string, unknown> {
  const base = buildBaseContext(input)
  const rows = input.rows as RecruitmentSourceRow[]
  const best = getBestSource(rows)

  const detailRows = rows.map((r) => ({
    sourceLabel: normalizeSourceLabel(
      r.sourceLabel,
      r.sourceKey ?? r.applicationSource
    ),
    vacancyTitle: r.vacancyTitle ?? EM_DASH,
    clientName: displayCompanyOrClientLabel(r.clientName, undefined),
    candidatesCount: formatExecutiveInt(r.candidatesCount),
    preselectedCount: formatExecutiveInt(r.preselectedCount),
    interviewedCount: formatExecutiveInt(r.interviewedCount),
    finalistsCount: formatExecutiveInt(r.finalistsCount),
    hiresCount: formatExecutiveInt(r.hiresCount),
    conversionPercent: formatSourcePercent(
      Number(r.conversionPercent ?? 0)
    ),
  }))

  const funnel = [
    { label: "Candidatos", value: getSourceTotalCandidates(rows) },
    { label: "Preseleccionados", value: getSourceTotalPreselected(rows) },
    { label: "Entrevistados", value: getSourceTotalInterviewed(rows) },
    { label: "Finalistas", value: getSourceTotalFinalists(rows) },
    { label: "Contratados", value: getSourceTotalHires(rows) },
  ].map((s) => ({
    label: s.label,
    value: formatExecutiveInt(s.value),
  }))

  return {
    ...base,
    sourcesTotal: formatExecutiveInt(input.totalCount),
    totalCandidates: formatExecutiveInt(getSourceTotalCandidates(rows)),
    totalHires: formatExecutiveInt(getSourceTotalHires(rows)),
    averageConversion: formatSourcePercent(getAverageConversion(rows)),
    bestSourceLabel: best
      ? normalizeSourceLabel(
          best.row.sourceLabel,
          best.row.sourceKey ?? best.row.applicationSource
        )
      : EM_DASH,
    funnelStages: funnel,
    detailRows,
    sourceRows: detailRows,
  }
}

function buildPreliminaryMatchContext(
  input: BuildReportTemplateContextInput
): Record<string, unknown> {
  const base = buildBaseContext(input)
  const rows = input.rows as PreliminaryMatchScoreRow[]
  const avg = calculateAverageScore(rows)
  const levels = groupByMatchLevel(rows)
  const vacancyAvg = groupByVacancyAverage(rows)
  const lastFmt = latestAnalysisFormatted(rows)

  const detailRows = rows.map((r) => {
    const score = preliminaryMatchScoreValue(r)
    const lvl = normalizeMatchLevel(r)
    return {
      candidateName: candidateDisplayName(r),
      email: candidateEmailDisplay(r) ?? EM_DASH,
      vacancyTitle: r.vacancyTitle ?? EM_DASH,
      clientName: displayCompanyOrClientLabel(r.clientName, r.companyName),
      scorePercent: score == null ? EM_DASH : `${score.toFixed(1)}%`,
      matchLevel: lvl,
      status: (r.analysisStatus ?? r.status ?? EM_DASH).trim() || EM_DASH,
      stageName: stageDisplayLabel(r),
      analyzedAt: formatReportDate(rowAnalysisIso(r)),
    }
  })

  const levelDistribution = (["High", "Medium", "Low", "Unknown"] as const).map(
    (key) => ({
      key,
      count: formatExecutiveInt(levels[key]),
    })
  )

  const vacancyRanking = vacancyAvg.map((v) => ({
    vacancyTitle: v.vacancyTitle,
    averageScore: formatExecutivePercent(v.averageScore),
    candidateCount: formatExecutiveInt(v.count),
  }))

  return {
    ...base,
    analysesTotal: formatExecutiveInt(input.totalCount),
    averageScore: avg == null ? EM_DASH : formatExecutivePercent(avg),
    matchHighCount: formatExecutiveInt(countMatchLevelEquals(rows, "High")),
    matchLowCount: formatExecutiveInt(countMatchLevelEquals(rows, "Low")),
    lastAnalysisDate: lastFmt?.dateLine ?? EM_DASH,
    lastAnalysisTime: lastFmt?.timeLine ?? EM_DASH,
    levelDistribution,
    vacancyRanking,
    detailRows,
  }
}

function formatDaysValue(value: unknown, fractionDigits = 1): string {
  if (value == null) return EM_DASH
  const n = Number(value)
  if (!Number.isFinite(n)) return EM_DASH
  return Number.isInteger(n) ? String(n) : n.toFixed(fractionDigits)
}

function formatPercentValue(value: unknown, fractionDigits = 1): string {
  if (value == null) return EM_DASH
  const n = Number(value)
  if (!Number.isFinite(n)) return EM_DASH
  return `${n.toFixed(fractionDigits)}%`
}

function formatBoolValue(value: unknown): string {
  if (value === true) return "Sí"
  if (value === false) return "No"
  return EM_DASH
}

function formatDeltaValue(value: unknown, unit: string): string {
  if (value == null) return EM_DASH
  const n = Number(value)
  if (!Number.isFinite(n)) return EM_DASH
  const sign = n > 0 ? "+" : ""
  if (unit === "percent") {
    return `${sign}${n.toFixed(1)} pp`
  }
  return `${sign}${Number.isInteger(n) ? String(n) : n.toFixed(1)} días`
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function buildTimeToHireKpiContext(
  input: BuildReportTemplateContextInput
): Record<string, unknown> {
  const base = buildBaseContext(input)
  const rows = input.rows as TimeToHireKpiRow[]
  const extras = toRecord(input.extras)
  const summary = (toRecord(extras?.summary) ?? {}) as TimeToHireKpiSummary
  const aiComparison =
    (toRecord(extras?.aiComparison) ?? {}) as TimeToHireKpiAiComparison

  const totalVacancies = formatExecutiveInt(summary.totalVacancies ?? 0)
  const filledVacancies = formatExecutiveInt(summary.filledVacancies ?? 0)
  const openVacancies = formatExecutiveInt(summary.openVacancies ?? 0)

  const aiMetrics = (aiComparison.metrics ?? []).map(
    (m: TimeToHireKpiAiMetric) => ({
      metric: m.metric ?? EM_DASH,
      label: m.label ?? m.metric ?? EM_DASH,
      unit: m.unit ?? EM_DASH,
      actual:
        m.unit === "percent"
          ? formatPercentValue(m.actual)
          : formatDaysValue(m.actual),
      benchmark:
        m.unit === "percent"
          ? formatPercentValue(m.benchmark)
          : formatDaysValue(m.benchmark),
      delta: formatDeltaValue(m.deltaAbsolute, m.unit ?? ""),
      deltaPercent:
        m.deltaPercent == null ? EM_DASH : formatPercentValue(m.deltaPercent),
      improved: formatBoolValue(m.improvedVsBenchmark),
    })
  )

  const aiProcesses = (aiComparison.processes ?? []).map(
    (p: TimeToHireKpiAiProcess) => ({
      processKey: p.processKey ?? EM_DASH,
      processLabel: p.processLabel ?? p.processKey ?? EM_DASH,
      aiMinutes: formatExecutiveInt(p.aiMinutes ?? 0),
      manualMinutes: formatExecutiveInt(p.manualMinutes ?? 0),
      deltaMinutes: formatExecutiveInt(p.deltaMinutes ?? 0),
      savingsPercent: formatPercentValue(p.savingsPercent),
    })
  )

  const detailRows = rows.map((r) => ({
    clientName: r.clientName ?? EM_DASH,
    vacancyTitle: r.vacancyTitle ?? EM_DASH,
    vacancyStatus: r.vacancyStatus ?? EM_DASH,
    openedAt: formatReportDate(r.openedAt),
    firstHireAt: formatReportDate(r.firstHireAt),
    isFilled: formatBoolValue(r.isFilled ?? null),
    timeToFillDays: formatDaysValue(r.timeToFillDays),
    timeToHireDays: formatDaysValue(r.timeToHireDays),
    daysOpen: formatDaysValue(r.daysOpen),
    isSlaBreached: formatBoolValue(r.isSlaBreached ?? null),
    totalCandidates: formatExecutiveInt(r.totalCandidates ?? 0),
    candidatesHired: formatExecutiveInt(r.candidatesHired ?? 0),
  }))

  return {
    ...base,
    totalVacancies,
    filledVacancies,
    openVacancies,
    averageTimeToFillDays: formatDaysValue(summary.averageTimeToFillDays),
    medianTimeToFillDays: formatDaysValue(summary.medianTimeToFillDays),
    minTimeToFillDays: formatDaysValue(summary.minTimeToFillDays),
    maxTimeToFillDays: formatDaysValue(summary.maxTimeToFillDays),
    averageTimeToHireDays: formatDaysValue(summary.averageTimeToHireDays),
    medianTimeToHireDays: formatDaysValue(summary.medianTimeToHireDays),
    averageDaysOpenUnfilled: formatDaysValue(summary.averageDaysOpenUnfilled),
    fillRatePercent: formatPercentValue(summary.fillRatePercent),
    slaBreachedCount: formatExecutiveInt(summary.slaBreachedCount ?? 0),
    slaThresholdDays: formatExecutiveInt(summary.slaThresholdDays ?? 0),
    aiMetrics,
    aiProcesses,
    detailRows,
  }
}

function buildRecruiterProductivityContext(
  input: BuildReportTemplateContextInput
): Record<string, unknown> {
  const base = buildBaseContext(input)
  const rows = input.rows as RecruiterProductivityRow[]
  const specific = buildRecruiterProductivityTemplateContext({
    rows,
    totalCount: input.totalCount,
  })
  return { ...base, ...specific }
}

function buildSalaryExpectationsContext(
  input: BuildReportTemplateContextInput
): Record<string, unknown> {
  const base = buildBaseContext(input)
  const rows = input.rows as SalaryExpectationRow[]
  const extras = toRecord(input.extras)
  const summary = (toRecord(extras?.summary) ?? null) as
    | SalaryExpectationsSummary
    | null
  const currencyRaw = extras?.currency ?? extras?.Currency
  const currency = typeof currencyRaw === "string" ? currencyRaw : null
  const specific = buildSalaryExpectationsTemplateContext({
    rows,
    totalCount: input.totalCount,
    summary,
    currency,
  })
  return { ...base, ...specific }
}

function buildVacancyProgressContext(
  input: BuildReportTemplateContextInput
): Record<string, unknown> {
  const period = resolvePeriod(input.appliedFilters)
  const vacancyRows = input.rows as VacancyProgressByClientRow[]
  const specific = buildVacancyProgressReportTemplateContext({
    rows: vacancyRows,
    totalCount: input.totalCount,
    generatedAt: input.generatedAt,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    clientName: input.clientName,
  })
  return {
    ...buildBaseContext(input),
    ...specific,
  }
}

/**
 * Construye el contexto de interpolación para preview HTML y PDF schema.
 */
export function buildReportTemplateContext(
  input: BuildReportTemplateContextInput
): Record<string, unknown> {
  const key = input.reportKey.trim()

  switch (key) {
    case "vacancy-progress-by-client":
      return buildVacancyProgressContext(input)
    case "candidate-status-by-stage":
      return buildCandidateStatusContext(input)
    case "technical-evaluations":
      return buildTechnicalEvaluationsContext(input)
    case "recruitment-sources":
      return buildRecruitmentSourcesContext(input)
    case "preliminary-match-scores":
      return buildPreliminaryMatchContext(input)
    case "time-to-hire-kpi":
      return buildTimeToHireKpiContext(input)
    case "recruiter-productivity":
      return buildRecruiterProductivityContext(input)
    case "salary-expectations":
      return buildSalaryExpectationsContext(input)
    default:
      return buildBaseContext(input)
  }
}

/** Extrae campos serializables del contexto para el body del endpoint PDF. */
export function extractReportSummaryPayload(
  context: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!context) return null
  const keys = [
    "generatedAt",
    "periodStart",
    "periodEnd",
    "periodLabel",
    "clientName",
    "totalCount",
    "totalVacancies",
    "openVacancies",
    "totalClients",
    "totalCandidates",
    "vacanciesWithCandidates",
    "vacanciesWithoutCandidates",
    "candidatesInInterview",
    "candidatesFinalist",
    "candidatesHired",
    "averagePreliminaryMatchScore",
    "candidatesWithPreliminaryAnalysis",
    "evaluationsTotal",
    "approvedCount",
    "sourcesTotal",
    "totalHires",
    "analysesTotal",
    "averageScore",
    "totalVacancies",
    "filledVacancies",
    "openVacancies",
    "averageTimeToFillDays",
    "medianTimeToFillDays",
    "averageTimeToHireDays",
    "fillRatePercent",
    "slaBreachedCount",
    "slaThresholdDays",
    "recruitersTotal",
    "totalApplicationsManaged",
    "totalInterviewsScheduled",
    "totalInterviewsCompleted",
    "totalStageMoves",
    "totalOpenVacancies",
    "totalCandidatesAdded",
    "averageConversionPercent",
    "interviewCompletionRate",
    "topRecruiterName",
    "topRecruiterHires",
    "currency",
    "salaryRowsTotal",
    "applicationsWithSalary",
    "applicationsWithoutSalary",
    "coveragePercent",
    "averageSalary",
    "medianSalary",
    "minSalary",
    "maxSalary",
    "percentile25Salary",
    "percentile75Salary",
    "withinRangeCount",
    "aboveRangeCount",
    "belowRangeCount",
    "withinRangePercent",
    "aboveRangePercent",
    "belowRangePercent",
    "dominantBucketLabel",
    "dominantBucketCount",
  ]
  const out: Record<string, unknown> = {}
  for (const key of keys) {
    const value = context[key]
    if (value == null) continue
    const t = typeof value
    if (t === "string" || t === "number" || t === "boolean") out[key] = value
  }
  return Object.keys(out).length === 0 ? null : out
}

export function formatPeriodFromFilters(
  appliedFilters: Record<string, string>
): { periodStart: string; periodEnd: string } {
  return resolvePeriod(appliedFilters)
}

export { formatIsoDateForPdf }
