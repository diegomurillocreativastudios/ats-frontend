const MAX_PREVIEW_HTML_CHARS = 4_500_000

/**
 * Vista previa ya paginada del panel RRHH (tras `sanitizeTechnicalSheetPreviewHtml`).
 */
export function isValidTechnicalSheetPreviewHtml(html: string): boolean {
  const trimmed = html.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_PREVIEW_HTML_CHARS) return false
  if (!/^<!DOCTYPE/i.test(trimmed) && !/<html[\s>]/i.test(trimmed)) return false
  if (!trimmed.includes("technical-sheet-doc")) return false
  if (!trimmed.includes("technical-sheet-page")) return false
  return true
}
