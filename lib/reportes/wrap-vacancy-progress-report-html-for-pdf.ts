/**
 * Wraps an interpolated vacancy-progress report fragment in a full HTML document
 * suitable for Chromium's `page.pdf()` with `preferCSSPageSize: true`.
 *
 * Inyecta CSS defensivo (page geometry + safety rules) ANTES del `<style>` que
 * trae la plantilla, de modo que las reglas específicas de la plantilla puedan
 * sobreescribir colores/tipografías, pero las reglas con `!important`
 * (transform/zoom) ganen siempre y eviten que un preview de pantalla se cuele
 * al PDF.
 */
const HEAD_META = `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />`

const PDF_WRAPPER_CSS = `
/* Safe defaults para el PDF — la plantilla puede extender via su propio <style>. */
@page {
  size: Letter portrait;
  margin: 0;
}

html,
body {
  margin: 0;
  padding: 0;
  background: white;
  width: 100%;
}

.report-page {
  width: 8.5in;
  min-height: 11in;
  box-sizing: border-box;
  transform: none !important;
  zoom: 1 !important;
  page-break-after: always;
}

.report-page:last-child {
  page-break-after: auto;
}
`

const WRAPPER_STYLE_TAG = `<style data-report-pdf-wrapper>${PDF_WRAPPER_CSS}</style>`

export function wrapVacancyProgressReportHtmlForPdf(html: string): string {
  const trimmed = html.trim()
  if (trimmed === "") {
    return `<!DOCTYPE html><html lang="es"><head>${HEAD_META}${WRAPPER_STYLE_TAG}</head><body></body></html>`
  }

  const looksLikeFullDocument =
    /^<!DOCTYPE/i.test(trimmed) || /<html[\s>]/i.test(trimmed)
  if (!looksLikeFullDocument) {
    return `<!DOCTYPE html><html lang="es"><head>${HEAD_META}${WRAPPER_STYLE_TAG}</head><body>${trimmed}</body></html>`
  }

  if (/<head[\s>]/i.test(trimmed)) {
    return trimmed.replace(
      /<head([^>]*)>/i,
      `<head$1>${HEAD_META}${WRAPPER_STYLE_TAG}`
    )
  }
  return trimmed.replace(
    /<html([^>]*)>/i,
    `<html$1><head>${HEAD_META}${WRAPPER_STYLE_TAG}</head>`
  )
}
