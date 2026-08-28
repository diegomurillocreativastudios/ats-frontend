/**
 * Root element inside an iframe preview / off-screen capture host.
 */
export function resolveReportPreviewPdfElement(panelRoot: HTMLElement): HTMLElement | null {
  const iframe = panelRoot.querySelector("iframe")
  const doc = iframe?.contentDocument
  if (!doc) return null

  const main =
    doc.querySelector("main.report-preview-doc") ??
    doc.querySelector("main.report-page") ??
    doc.querySelector("main") ??
    doc.body

  return main instanceof HTMLElement ? main : null
}

function resolveFromSearchRoot(root: ParentNode): HTMLElement | null {
  const wrapper = root.querySelector(".report-preview-doc")
  if (wrapper instanceof HTMLElement) return wrapper

  const reportPage = root.querySelector("main.report-page")
  if (reportPage instanceof HTMLElement) return reportPage

  const main = root.querySelector("main.report-preview-doc")
  if (main instanceof HTMLElement) return main

  const article = root.querySelector("article")
  if (article instanceof HTMLElement) return article

  return null
}

/**
 * Element to rasterize for report PDF export.
 *
 * Prefers an isolated iframe (`srcDoc`) inside the capture host so template HTML
 * never needs `dangerouslySetInnerHTML` in the app document. Falls back to
 * Shadow DOM / light DOM roots for legacy React-rendered captures.
 */
export function resolveReportPdfCaptureElement(captureRoot: HTMLElement | null): HTMLElement | null {
  if (!captureRoot) return null

  const fromIframe = resolveReportPreviewPdfElement(captureRoot)
  if (fromIframe) return fromIframe

  const searchRoots: ParentNode[] = []
  if (captureRoot.shadowRoot) {
    searchRoots.push(captureRoot.shadowRoot)
  }
  searchRoots.push(captureRoot)

  for (const root of searchRoots) {
    const found = resolveFromSearchRoot(root)
    if (found) return found
  }

  return captureRoot
}
