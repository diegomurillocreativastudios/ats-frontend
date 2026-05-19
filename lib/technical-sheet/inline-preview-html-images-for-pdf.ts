import { tryLoadVisibleLogoDataUriForTechnicalSheetPdf } from "@/lib/technical-sheet/technical-sheet-pdf-logo"

/** Sustituye el logo por data URI para que Chromium no dependa de red en serverless. */
export function inlineVisibleLogoInPreviewHtml(html: string): string {
  const dataUri = tryLoadVisibleLogoDataUriForTechnicalSheetPdf()
  if (!dataUri) return html
  const safe = dataUri.replace(/"/g, "&quot;")
  return html.replace(/src=(["'])[^"']*visible-icon\.png[^"']*\1/gi, `src="${safe}"`)
}
