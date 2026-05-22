/**
 * Wraps an interpolated vacancy-progress report fragment in a full HTML document
 * suitable for Chromium's `page.pdf()` with `preferCSSPageSize: true`.
 *
 * Unlike the technical-sheet wrapper, this one does NOT inject an `@page` override —
 * the report template itself declares `@page { size: Letter; margin: ... }` and
 * Chromium honors those margins on every page (including continuations).
 */
const HEAD_META = `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />`

export function wrapVacancyProgressReportHtmlForPdf(html: string): string {
  const trimmed = html.trim()
  if (trimmed === "") {
    return `<!DOCTYPE html><html lang="es"><head>${HEAD_META}</head><body></body></html>`
  }

  const looksLikeFullDocument =
    /^<!DOCTYPE/i.test(trimmed) || /<html[\s>]/i.test(trimmed)
  if (!looksLikeFullDocument) {
    return `<!DOCTYPE html><html lang="es"><head>${HEAD_META}</head><body>${trimmed}</body></html>`
  }

  if (/<head[\s>]/i.test(trimmed)) {
    return trimmed
  }
  return trimmed.replace(
    /<html([^>]*)>/i,
    `<html$1><head>${HEAD_META}</head>`
  )
}
