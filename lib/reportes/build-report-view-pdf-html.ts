const SCRIPT_TAG_RE = /<script\b[\s\S]*?<\/script>/gi
const IFRAME_TAG_RE = /<iframe\b[\s\S]*?<\/iframe>/gi

export const REPORT_PDF_BASE_CSS = `
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: white;
}
[data-report-pdf-exclude="true"] {
  display: none !important;
}
@page {
  size: A4;
  margin: 12mm;
}
`.trim()

/**
 * Ajustes de layout para tablas y rejillas del portal (después del CSS de la app).
 */
const REPORT_PDF_TAIL_OVERRIDES_CSS = `
html,body{
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
}
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
  const css = `${REPORT_PDF_BASE_CSS}\n${bundled}\n${REPORT_PDF_TAIL_OVERRIDES_CSS}`

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><base href="${escapeHtmlAttr(baseHref)}"/>${links}<style>${css}</style></head><body>${bodyHtml}</body></html>`
}
