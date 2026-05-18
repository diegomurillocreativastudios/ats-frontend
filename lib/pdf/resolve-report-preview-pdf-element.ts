/**
 * Root element inside the iframe preview (legacy; prefer capture root in main document).
 */
export function resolveReportPreviewPdfElement(panelRoot: HTMLElement): HTMLElement | null {
  const iframe = panelRoot.querySelector("iframe")
  const doc = iframe?.contentDocument
  if (!doc) return null

  const main =
    doc.querySelector("main.report-preview-doc") ??
    doc.querySelector("main") ??
    doc.body

  return main instanceof HTMLElement ? main : null
}

/**
 * Element inside the off-screen capture container in the main document (html2canvas-safe).
 */
export function resolveReportPdfCaptureElement(captureRoot: HTMLElement | null): HTMLElement | null {
  if (!captureRoot) return null

  const main = captureRoot.querySelector("main.report-preview-doc")
  if (main instanceof HTMLElement) return main

  const article = captureRoot.querySelector("article")
  if (article instanceof HTMLElement) return article

  return captureRoot
}
