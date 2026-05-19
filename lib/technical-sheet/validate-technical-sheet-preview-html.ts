const MAX_PREVIEW_HTML_CHARS = 2_000_000

const BLOCKED_PATTERNS = [
  /<script\b/i,
  /javascript:/i,
  /\bon\w+\s*=/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
] as const

/**
 * Vista previa ya paginada del panel RRHH; se valida antes de rasterizar a PDF en el servidor.
 */
export function isValidTechnicalSheetPreviewHtml(html: string): boolean {
  const trimmed = html.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_PREVIEW_HTML_CHARS) return false
  if (!/^<!DOCTYPE/i.test(trimmed) && !/<html[\s>]/i.test(trimmed)) return false
  if (!trimmed.includes("technical-sheet-doc")) return false
  if (!trimmed.includes("technical-sheet-page")) return false
  return !BLOCKED_PATTERNS.some((re) => re.test(trimmed))
}
