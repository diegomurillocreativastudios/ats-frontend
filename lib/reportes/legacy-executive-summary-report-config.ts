import { defaultMonthDateRange } from "@/lib/reportes-display"
import type { ReportTemplateConfig } from "@/lib/reportes/report-document-types"

/**
 * Fallback config while GET report-templates/{id}/config is unavailable.
 */
export function buildLegacyExecutiveSummaryReportConfig(): ReportTemplateConfig {
  const range = defaultMonthDateRange()
  return {
    reportKey: "executive-summary",
    pdfOrientation: "landscape",
    pdfFormat: "a4",
    defaultFilters: {
      clientId: "",
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    },
    filterSchema: {
      fields: [
        {
          key: "clientId",
          label: "Cliente",
          type: "select",
          source: "clients",
        },
        {
          key: "dateFrom",
          label: "Desde",
          type: "date",
        },
        {
          key: "dateTo",
          label: "Hasta",
          type: "date",
        },
      ],
    },
  }
}
