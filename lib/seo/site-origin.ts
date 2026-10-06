import { APP_NAME } from "@/lib/app-brand"

/** Logo PNG used for social cards. Dimensions match `public/Applican_Tree.png`. */
export const DEFAULT_SOCIAL_IMAGE = {
  url: "/Applican_Tree.png",
  width: 696,
  height: 376,
  alt: APP_NAME,
} as const

/**
 * Public site origin from `NEXT_PUBLIC_APP_URL`.
 * Returns undefined when the variable is missing or not a valid absolute URL.
 */
export function readMetadataBase(
  raw: string | undefined = process.env.NEXT_PUBLIC_APP_URL
): URL | undefined {
  const trimmed = raw?.trim().replace(/\/$/, "")
  if (!trimmed) return undefined
  try {
    const url = new URL(trimmed)
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined
    return url
  } catch {
    return undefined
  }
}

/** Origin without a trailing slash, or null when the public URL is not configured. */
export function readPublicOrigin(
  raw: string | undefined = process.env.NEXT_PUBLIC_APP_URL
): string | null {
  const base = readMetadataBase(raw)
  if (!base) return null
  return base.href.replace(/\/$/, "")
}

export function readGoogleSiteVerification(
  raw: string | undefined = process.env.GOOGLE_SITE_VERIFICATION
): string | undefined {
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}
