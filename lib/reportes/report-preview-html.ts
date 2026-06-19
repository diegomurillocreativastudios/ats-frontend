const REPORT_PREVIEW_BASE_STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #202124;
    background: #fff;
  }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
`

/** Neutralizes print-sized body text (~9.5pt) when shown in an on-screen iframe. */
export const REPORT_PRINT_PREVIEW_SCREEN_ZOOM = 10 / 9

export interface WrapReportPreviewHtmlOptions {
  /** Applied only inside `@media screen` (iframe preview), not for PDF capture. */
  screenZoom?: number
}

function buildPreviewStyles(options?: WrapReportPreviewHtmlOptions): string {
  const screenZoom =
    options?.screenZoom != null && options.screenZoom > 0
      ? options.screenZoom
      : null
  const screenZoomRule = screenZoom
    ? `@media screen { html { zoom: ${screenZoom}; } }`
    : ""
  return `${REPORT_PREVIEW_BASE_STYLES}${screenZoomRule}`
}

/**
 * Wraps partial template HTML in a document suitable for iframe preview / PDF capture.
 */
export function wrapReportPreviewHtml(
  bodyHtml: string,
  options?: WrapReportPreviewHtmlOptions
): string {
  const trimmed = bodyHtml.trim()
  const styles = buildPreviewStyles(options)
  if (/^<!DOCTYPE/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return trimmed
  }
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${styles}</style></head><body><main class="report-preview-doc">${trimmed}</main></body></html>`
}
