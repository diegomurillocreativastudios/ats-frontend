const REPORT_PREVIEW_BASE_STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #0f172a;
    background: #fff;
  }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
`

/**
 * Wraps partial template HTML in a document suitable for iframe preview / PDF capture.
 */
export function wrapReportPreviewHtml(bodyHtml: string): string {
  const trimmed = bodyHtml.trim()
  if (/^<!DOCTYPE/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return trimmed
  }
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${REPORT_PREVIEW_BASE_STYLES}</style></head><body><main class="report-preview-doc">${trimmed}</main></body></html>`
}
