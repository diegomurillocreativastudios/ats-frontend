/** Motor PDF expuesto en `X-Report-Pdf-Engine`. */
export const REPORT_PDF_ENGINE = "pdfkit-v2" as const

/** Versión legacy del reporte avance vacantes (compatibilidad con tests existentes). */
export const VACANCY_PROGRESS_PDF_TEMPLATE_VERSION =
  "vacancy-progress-full-v2" as const

/** Alias histórico — mismo motor que `REPORT_PDF_ENGINE`. */
export const VACANCY_PROGRESS_PDF_ENGINE = REPORT_PDF_ENGINE

/**
 * Versión de plantilla por `reportKey` (header `X-Report-Pdf-Template-Version`).
 */
export function reportPdfTemplateVersion(reportKey: string): string {
  const key = reportKey.trim()
  if (key === "vacancy-progress-by-client") {
    return VACANCY_PROGRESS_PDF_TEMPLATE_VERSION
  }
  return `${key}-schema-v1`
}
