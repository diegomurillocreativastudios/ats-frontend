/**
 * True when a MIME type (or data URI media type) is SVG.
 * SVG logos must not be inlined as img/data URI (active content risk).
 */
export function isSvgImageContentType(contentType: string): boolean {
  const media = contentType.toLowerCase().split(";")[0]?.trim() ?? ""
  return media === "image/svg+xml" || media === "image/svg"
}

export interface LogoDataUriInput {
  base64?: string | null
  contentType?: string | null
}

/**
 * Builds a safe raster logo data URI. Returns null for empty, SVG, or svg data URIs.
 */
export function buildSafeLogoDataUri(
  logo: LogoDataUriInput | null | undefined
): string | null {
  if (!logo) return null
  const base64 = String(logo.base64 ?? "").trim()
  if (!base64) return null

  if (base64.startsWith("data:")) {
    const mediaMatch = /^data:([^;,]+)/i.exec(base64)
    const media = mediaMatch?.[1] ?? ""
    if (isSvgImageContentType(media)) return null
    return base64
  }

  const contentType =
    String(logo.contentType ?? "image/png").trim() || "image/png"
  if (isSvgImageContentType(contentType)) return null

  return `data:${contentType};base64,${base64}`
}
