import { TECHNICAL_SHEET_PDF_MAX_HTML_CHARS } from "@/lib/technical-sheet/pdf-chromium-limits"

export { TECHNICAL_SHEET_PDF_MAX_HTML_CHARS }

/**
 * Vista previa ya paginada del panel RRHH (tras `sanitizeTechnicalSheetPreviewHtml`).
 */
export function isValidTechnicalSheetPreviewHtml(html: string): boolean {
  const trimmed = html.trim()
  if (trimmed.length === 0 || trimmed.length > TECHNICAL_SHEET_PDF_MAX_HTML_CHARS) {
    return false
  }
  if (!/^<!DOCTYPE/i.test(trimmed) && !/<html[\s>]/i.test(trimmed)) return false
  if (!trimmed.includes("technical-sheet-doc")) return false
  if (!trimmed.includes("technical-sheet-page")) return false
  return true
}

/**
 * Rechaza HTML demasiado grande antes de lanzar Chromium (preview o plantilla).
 */
export function assertTechnicalSheetPdfHtmlSize(html: string): void {
  const len = html.trim().length
  if (len > TECHNICAL_SHEET_PDF_MAX_HTML_CHARS) {
    const err = new Error(
      `El HTML del PDF excede el límite permitido (${TECHNICAL_SHEET_PDF_MAX_HTML_CHARS} caracteres).`
    ) as Error & { status?: number }
    err.status = 413
    throw err
  }
}
