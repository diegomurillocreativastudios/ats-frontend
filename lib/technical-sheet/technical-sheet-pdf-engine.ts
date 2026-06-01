export type TechnicalSheetPdfEngine = "chromium" | "pdfkit"

/**
 * Motor por defecto: Chromium (HTML fiel). Rollback temporal PDFKit vía env o query.
 * `TECHNICAL_SHEET_PDF_ENGINE=pdfkit` o `?engine=pdfkit`.
 */
export function resolveTechnicalSheetPdfEngine(request: Request): TechnicalSheetPdfEngine {
  const env = process.env.TECHNICAL_SHEET_PDF_ENGINE?.trim().toLowerCase()
  if (env === "pdfkit") return "pdfkit"
  try {
    const url = new URL(request.url)
    if (url.searchParams.get("engine") === "pdfkit") return "pdfkit"
  } catch {
    /* ignore invalid URL */
  }
  return "chromium"
}
