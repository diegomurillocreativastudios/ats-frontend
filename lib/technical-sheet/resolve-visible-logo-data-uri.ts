import { buildVisibleLogoUrlForTechnicalSheet } from "@/lib/technical-sheet/server-public-app-url"
import { tryLoadVisibleLogoDataUriForTechnicalSheetPdf } from "@/lib/technical-sheet/technical-sheet-pdf-logo"

/**
 * Logo Visible como data URI: disco (local/build) o fetch al origen público (Vercel serverless).
 */
export async function resolveVisibleLogoDataUriForPdf(): Promise<string | null> {
  const fromDisk = tryLoadVisibleLogoDataUriForTechnicalSheetPdf()
  if (fromDisk) return fromDisk

  const url = buildVisibleLogoUrlForTechnicalSheet()
  if (!url) return null

  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) return null
    const contentType = (res.headers.get("content-type") ?? "image/png").split(";")[0]?.trim()
    return `data:${contentType || "image/png"};base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}
