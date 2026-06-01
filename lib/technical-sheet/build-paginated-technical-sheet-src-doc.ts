import { TECHNICAL_SHEET_MULTI_PAGE_STYLES } from "@/lib/technical-sheet/technical-sheet-page-shell"

/** Documento HTML multipágina listo para iframe de vista previa o `page.pdf`. */
export function buildPaginatedTechnicalSheetSrcDoc(pagesHtml: readonly string[]): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>${TECHNICAL_SHEET_MULTI_PAGE_STYLES}</head><body><main class="technical-sheet-doc">${pagesHtml.join("")}</main></body></html>`
}
