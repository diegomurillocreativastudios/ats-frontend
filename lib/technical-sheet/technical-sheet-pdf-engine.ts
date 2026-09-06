export type TechnicalSheetPdfEngine = "chromium" | "pdfkit"

/**
 * Motor por defecto: PDFKit + esquema JSON (igual que reportes).
 * Rollback Chromium: `TECHNICAL_SHEET_PDF_ENGINE=chromium` o `?engine=chromium`.
 */
export function resolveTechnicalSheetPdfEngine(request: Request): TechnicalSheetPdfEngine {
  const env = process.env.TECHNICAL_SHEET_PDF_ENGINE?.trim().toLowerCase()
  if (env === "chromium") return "chromium"
  if (env === "pdfkit") return "pdfkit"
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get("engine")?.trim().toLowerCase()
    if (query === "chromium") return "chromium"
    if (query === "pdfkit") return "pdfkit"
  } catch {
    /* ignore invalid URL */
  }
  return "pdfkit"
}
