import type { ExecutiveSummaryReportPdfData } from "@/components/recruiter/reports/executive-summary-report-pdf-template"
import type { ReportsRecruiterSummary } from "@/lib/api/recruiter-reports"
import {
  formatIsoDateForPdf,
  mapSummaryToExecutiveReportPdfData,
} from "@/lib/reportes/executive-summary-metrics"

function pickNum(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === "number" && !Number.isNaN(v)) return v
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number.parseFloat(v)
      if (!Number.isNaN(n)) return n
    }
  }
  return null
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return null
}

/**
 * Maps API preview context to executive-summary React PDF data when possible.
 */
export function mapPreviewContextToExecutivePdfData(
  context: Record<string, unknown>
): ExecutiveSummaryReportPdfData | null {
  const summary =
    (context.summary as Record<string, unknown> | undefined) ??
    (context.report as Record<string, unknown> | undefined) ??
    context

  const totalVacancies = pickNum(summary, "totalVacancies", "TotalVacancies")
  if (totalVacancies == null && pickNum(summary, "totalCandidates") == null) {
    return null
  }

  return {
    totalClients: pickNum(summary, "totalClients", "TotalClients") ?? 0,
    totalVacancies: totalVacancies ?? 0,
    openVacancies: pickNum(summary, "openVacancies", "OpenVacancies") ?? 0,
    closedVacancies: pickNum(summary, "closedVacancies", "ClosedVacancies") ?? 0,
    totalCandidates: pickNum(summary, "totalCandidates", "TotalCandidates") ?? 0,
    candidatesInInterview:
      pickNum(summary, "candidatesInInterview", "CandidatesInInterview") ?? 0,
    candidatesHired:
      pickNum(summary, "candidatesHired", "CandidatesHired", "hiredCount", "totalHires") ?? 0,
    averageVacancyProgressPercent: pickNum(
      summary,
      "averageVacancyProgressPercent",
      "AverageVacancyProgressPercent"
    ),
    averagePreliminaryMatchScore: pickNum(
      summary,
      "averagePreliminaryMatchScore",
      "AveragePreliminaryMatchScore"
    ),
    technicalEvaluationsCompleted:
      pickNum(
        summary,
        "technicalEvaluationsCompleted",
        "technicalEvaluationsCount",
        "TechnicalEvaluationsCompleted"
      ) ?? 0,
    technicalEvaluationPassRate: pickNum(
      summary,
      "technicalEvaluationPassRate",
      "technicalEvaluationApprovalRate",
      "TechnicalEvaluationPassRate"
    ),
    topRecruitmentSource: pickStr(
      summary,
      "topRecruitmentSource",
      "mainRecruitmentSource",
      "mainSourceLabel",
      "TopRecruitmentSource"
    ),
  }
}

export function mapPreviewContextToPdfFilters(
  context: Record<string, unknown>,
  appliedFilters: Record<string, unknown>,
  clientNameResolver?: (clientId: string) => string
): { clientName: string; from: string; to: string } {
  const filtersCtx = context.filters as Record<string, unknown> | undefined
  const reportCtx = context.report as Record<string, unknown> | undefined

  const clientName =
    pickStr(filtersCtx ?? {}, "clientName", "ClientName") ??
    pickStr(reportCtx ?? {}, "clientName", "ClientName") ??
    pickStr(context, "clientName", "ClientName") ??
    (() => {
      const clientId = String(appliedFilters.clientId ?? "").trim()
      if (!clientId) return "Todos"
      return clientNameResolver?.(clientId) ?? "Cliente"
    })()

  const from =
    pickStr(filtersCtx ?? {}, "from", "From", "dateFrom") ??
    pickStr(reportCtx ?? {}, "from", "dateFrom") ??
    formatIsoDateForPdf(String(appliedFilters.dateFrom ?? appliedFilters.from ?? ""))

  const to =
    pickStr(filtersCtx ?? {}, "to", "To", "dateTo") ??
    pickStr(reportCtx ?? {}, "to", "dateTo") ??
    formatIsoDateForPdf(String(appliedFilters.dateTo ?? appliedFilters.to ?? ""))

  return { clientName, from, to }
}

export function mapSummaryPreviewToExecutivePdfData(summary: ReportsRecruiterSummary) {
  return mapSummaryToExecutiveReportPdfData(summary)
}
