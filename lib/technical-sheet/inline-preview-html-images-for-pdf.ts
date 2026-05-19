import { resolveVisibleLogoDataUriForPdf } from "@/lib/technical-sheet/resolve-visible-logo-data-uri"

/** Sustituye el logo por data URI para que Chromium no dependa de red en serverless. */
export async function inlineVisibleLogoInPreviewHtml(html: string): Promise<string> {
  const dataUri = await resolveVisibleLogoDataUriForPdf()
  if (!dataUri) return html
  const safe = dataUri.replace(/"/g, "&quot;")
  return html.replace(/src=(["'])[^"']*visible-icon\.png[^"']*\1/gi, `src="${safe}"`)
}
