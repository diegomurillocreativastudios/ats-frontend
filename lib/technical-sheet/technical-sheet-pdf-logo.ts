import { readFileSync } from "node:fs"
import { join } from "node:path"
import sharp from "sharp"
import { APP_LOGO_SVG_FILE } from "@/lib/app-brand"

const LOGO_REL_SEGMENTS = ["public", APP_LOGO_SVG_FILE] as const

function readAppLogoSvgBuffer(): Buffer | null {
  try {
    const filePath = join(process.cwd(), ...LOGO_REL_SEGMENTS)
    const buf = readFileSync(filePath)
    return buf.length > 0 ? buf : null
  } catch {
    return null
  }
}

/**
 * Logo Appli AI como data URI SVG (sin red) para vistas HTML / PDF headless.
 */
export function tryLoadVisibleLogoDataUriForTechnicalSheetPdf(): string | null {
  const buf = readAppLogoSvgBuffer()
  if (!buf) return null
  return `data:image/svg+xml;base64,${buf.toString("base64")}`
}

/**
 * Rasteriza el SVG en memoria para PDFKit (no escribe PNG en disco).
 */
export async function tryLoadAppLogoRasterBufferForPdfKit(
  widthPx = 64
): Promise<Buffer | null> {
  const svg = readAppLogoSvgBuffer()
  if (!svg) return null
  try {
    return await sharp(svg).resize(widthPx, widthPx).png().toBuffer()
  } catch {
    return null
  }
}
