/**
 * Elemento dentro del iframe de vista previa de ficha técnica (legacy html2canvas).
 */
export function resolveTechnicalSheetPdfElement(panelRoot: HTMLElement): HTMLElement | null {
  const iframe = panelRoot.querySelector("iframe")
  const doc = iframe?.contentDocument
  if (!doc) return null

  const main =
    doc.querySelector("main.technical-sheet-doc") ??
    doc.querySelector("main") ??
    doc.body

  return main instanceof HTMLElement ? main : null
}
