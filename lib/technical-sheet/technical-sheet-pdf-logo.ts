import { readFileSync } from "node:fs"
import { join } from "node:path"

const VISIBLE_LOGO_REL_SEGMENTS = ["public", "visible-icon.png"] as const

/**
 * Loads the Visible logo from `public/visible-icon.png` for PDF rendering (Data URI, no network).
 * Returns `null` if the file cannot be read (caller may use an absolute URL fallback).
 */
export function tryLoadVisibleLogoDataUriForTechnicalSheetPdf(): string | null {
  try {
    const filePath = join(process.cwd(), ...VISIBLE_LOGO_REL_SEGMENTS)
    const buf = readFileSync(filePath)
    if (buf.length === 0) return null
    return `data:image/png;base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}
