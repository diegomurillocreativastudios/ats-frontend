import type { ReportsRecruiterSummary } from "@/lib/api/recruiter-reports"
import {
  buildExecutiveInsights,
  formatExecutiveInt,
  formatExecutivePercent,
  formatGeneratedAtForPdf,
  mapSummaryToExecutiveReportPdfData,
  pickExecutiveTopSource,
} from "@/lib/reportes/executive-summary-metrics"

export interface ReportTemplateFiltersContext {
  clientName: string
  from: string
  to: string
}

export interface BuildReportTemplateContextOptions {
  summary: ReportsRecruiterSummary
  filters: ReportTemplateFiltersContext
  logoUrl?: string
  generatedAt?: string
}

/**
 * Builds interpolation context for report document templates (HTML placeholders).
 */
export function buildReportTemplateContext(
  options: BuildReportTemplateContextOptions
): Record<string, unknown> {
  const { summary, filters } = options
  const generatedAt = options.generatedAt ?? formatGeneratedAtForPdf()
  const logoUrl = String(options.logoUrl ?? "").trim()
  const metrics = mapSummaryToExecutiveReportPdfData(summary)
  const insights = buildExecutiveInsights(summary)

  const summaryFlat: Record<string, unknown> = {
    totalClients: metrics.totalClients,
    totalVacancies: metrics.totalVacancies,
    openVacancies: metrics.openVacancies,
    closedVacancies: metrics.closedVacancies,
    totalCandidates: metrics.totalCandidates,
    candidatesInInterview: metrics.candidatesInInterview,
    candidatesHired: metrics.candidatesHired,
    averageVacancyProgressPercent: metrics.averageVacancyProgressPercent,
    averagePreliminaryMatchScore: metrics.averagePreliminaryMatchScore,
    technicalEvaluationsCompleted: metrics.technicalEvaluationsCompleted,
    technicalEvaluationPassRate: metrics.technicalEvaluationPassRate,
    topRecruitmentSource: metrics.topRecruitmentSource ?? pickExecutiveTopSource(summary) ?? "",
    averageVacancyProgressPercentFormatted: formatExecutivePercent(
      metrics.averageVacancyProgressPercent
    ),
    averagePreliminaryMatchScoreFormatted: formatExecutivePercent(
      metrics.averagePreliminaryMatchScore
    ),
    technicalEvaluationPassRateFormatted: formatExecutivePercent(
      metrics.technicalEvaluationPassRate
    ),
  }

  const filtersCtx = {
    clientName: filters.clientName,
    from: filters.from,
    to: filters.to,
  }

  return {
    summary: summaryFlat,
    filters: filtersCtx,
    meta: {
      generatedAt,
      logoUrl,
      title: "Resumen ejecutivo de reportes",
    },
    report: {
      ...summaryFlat,
      ...filtersCtx,
      generatedAt,
      logoUrl,
    },
    insights,
    insight1: insights[0] ?? "",
    insight2: insights[1] ?? "",
    insight3: insights[2] ?? "",
    logoUrl,
    generatedAt,
    clientName: filters.clientName,
    dateFrom: filters.from,
    dateTo: filters.to,
    ...Object.fromEntries(
      Object.entries(summaryFlat).map(([k, v]) => [
        k,
        typeof v === "number" ? formatExecutiveInt(v) : v,
      ])
    ),
  }
}
