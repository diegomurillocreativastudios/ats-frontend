const SCRIPT_TAG_RE = /<script\b[\s\S]*?<\/script>/gi
const IFRAME_TAG_RE = /<iframe\b[\s\S]*?<\/iframe>/gi

/** Oculta en el PDF server-side chrome de filtros, exportación y paginación. */
export const REPORT_PDF_EXCLUDE_CSS = "[data-report-pdf-exclude]{display:none!important}"

/**
 * Va **al final** del `<style>` para ganar la cascada frente al CSS embebido de Tailwind.
 * - `@page` + `preferCSSPageSize` en Chromium suelen reducir saltos/hojas fantasmas por redondeo.
 * - `h-full` / rejillas con `align-items: stretch` pueden inflar la altura del documento y sumar una hoja vacía al cierre.
 */
const REPORT_PDF_TAIL_OVERRIDES_CSS = `
[data-report-pdf-exclude]{display:none!important}
@page{
  size:A4 landscape;
  margin:10mm;
}
html,body{
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
}
body{margin:0!important;padding:0!important}
.grid > .flex.h-full{
  height:auto!important;
  align-self:start!important;
}
.grid > div.flex.min-h-0{
  align-self:start!important;
  height:auto!important;
}
.grid > section.flex{
  align-self:start!important;
  height:auto!important;
}
/* Tablas en PDF: sin min-width rígido ni scroll horizontal (evita cortar la última columna). */
body .overflow-x-auto{
  overflow:visible!important;
  max-width:100%!important;
}
body table.border-collapse{
  min-width:0!important;
  width:100%!important;
  max-width:100%!important;
  table-layout:auto!important;
}
body table.border-collapse th,
body table.border-collapse td{
  overflow-wrap:anywhere!important;
  word-break:break-word!important;
}
body table.border-collapse td div.inline-flex.flex-col.items-end.gap-1{
  min-width:0!important;
  max-width:100%!important;
}
[data-report-pdf-hide-last-col] table thead tr > th:last-child,
[data-report-pdf-hide-last-col] table tbody tr > td:last-child{
  display:none!important;
}
`.trim()

export function stripDangerousMarkupFromReportFragment(html: string): string {
  return html.replace(SCRIPT_TAG_RE, "").replace(IFRAME_TAG_RE, "")
}

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

export function buildReportViewPdfHtmlDocument(input: {
  baseOrigin: string
  fragmentHtml: string
  stylesheetHrefs: string[]
  inlineHeadCss: string
}): string {
  const origin = input.baseOrigin.replace(/\/$/, "")
  const baseHref = `${origin}/`
  const links = input.stylesheetHrefs
    .filter((h) => /^https?:\/\//i.test(h))
    .slice(0, 60)
    .map((href) => `<link rel="stylesheet" href="${escapeHtmlAttr(href)}"/>`)
    .join("\n")

  const bodyHtml = stripDangerousMarkupFromReportFragment(input.fragmentHtml)
  const bundled = input.inlineHeadCss.slice(0, 400_000)
  const css = `${bundled}\n${REPORT_PDF_TAIL_OVERRIDES_CSS}`

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><base href="${escapeHtmlAttr(baseHref)}"/>${links}<style>${css}</style></head><body class="bg-background text-foreground antialiased">${bodyHtml}</body></html>`
}
