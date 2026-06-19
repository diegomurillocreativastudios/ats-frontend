import { APP_LOGO_SVG_SRC } from "@/lib/app-brand"
import { resolveVisibleLogoDataUriForPdf } from "@/lib/technical-sheet/resolve-visible-logo-data-uri"

/** Sustituye el logo por data URI para que Chromium no dependa de red en serverless. */
export async function inlineVisibleLogoInPreviewHtml(html: string): Promise<string> {
  const dataUri = await resolveVisibleLogoDataUriForPdf()
  if (!dataUri) return html
  const safe = dataUri.replace(/"/g, "&quot;")
  const logoFilePattern = APP_LOGO_SVG_SRC.replace(/^\//, "").replace(/\./g, "\\.")
  return html.replace(
    new RegExp(`src=(["'])[^"']*${logoFilePattern}[^"']*\\1`, "gi"),
    `src="${safe}"`
  )
}
