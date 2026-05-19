/**
 * Quita vectores obvios del HTML de vista previa antes de validar/rasterizar en el servidor.
 */
export function sanitizeTechnicalSheetPreviewHtml(html: string): string {
  let out = html
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  out = out.replace(/\s+on\w+\s*=\s*("(?:[^"]*)"|'(?:[^']*)'|[^\s>]+)/gi, "")
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
  out = out.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
  out = out.replace(/<embed\b[^>]*>/gi, "")
  return out
}
