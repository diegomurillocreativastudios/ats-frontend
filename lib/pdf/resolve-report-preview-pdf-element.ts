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
 *
 * The capture host now mounts the report HTML inside an open Shadow DOM (so its
 * embedded `<style>` block — full of `*`, `html`, `body` selectors — cannot
 * leak into the host page and shrink every `rem`-sized layout). We therefore
 * look first inside the shadow root, then fall back to the light DOM for
 * legacy capture roots that still inline the HTML directly.
 */
export function resolveReportPdfCaptureElement(captureRoot: HTMLElement | null): HTMLElement | null {
  if (!captureRoot) return null

  const searchRoots: ParentNode[] = []
  if (captureRoot.shadowRoot) {
    searchRoots.push(captureRoot.shadowRoot)
  }
  searchRoots.push(captureRoot)

  for (const root of searchRoots) {
    const wrapper = root.querySelector(".report-preview-doc")
    if (wrapper instanceof HTMLElement) return wrapper

    const reportPage = root.querySelector("main.report-page")
    if (reportPage instanceof HTMLElement) return reportPage

    const main = root.querySelector("main.report-preview-doc")
    if (main instanceof HTMLElement) return main

    const article = root.querySelector("article")
    if (article instanceof HTMLElement) return article
  }

  return captureRoot
}
