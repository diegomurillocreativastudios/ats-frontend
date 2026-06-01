/**
 * Injects `@page` Letter with zero margins and clears default document margins for `preferCSSPageSize`.
 * If the fragment is already a full HTML document, inserts the block into `<head>`.
 */
const PDF_ROOT_STYLE = `<style data-technical-sheet-pdf-root>@page { size: letter; margin: 0; }
html, body { margin: 0; padding: 0; }
</style>`

export function ensureTechnicalSheetPdfDocument(html: string): string {
  const trimmed = html.trim()
  if (trimmed === "") {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" />${PDF_ROOT_STYLE}</head><body></body></html>`
  }

  const looksLikeFullDocument = /^<!DOCTYPE/i.test(trimmed) || /<html[\s>]/i.test(trimmed)
  if (!looksLikeFullDocument) {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" />${PDF_ROOT_STYLE}</head><body>${trimmed}</body></html>`
  }

  if (/<\/head>/i.test(trimmed)) {
    return trimmed.replace(/<\/head>/i, `${PDF_ROOT_STYLE}</head>`)
  }
  if (/<head[\s>]/i.test(trimmed)) {
    return trimmed.replace(/<head([^>]*)>/i, `<head$1>${PDF_ROOT_STYLE}`)
  }
  return trimmed.replace(/<html([^>]*)>/i, `<html$1><head><meta charset="utf-8" />${PDF_ROOT_STYLE}</head>`)
}
