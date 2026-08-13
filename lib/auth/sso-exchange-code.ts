/**
 * Reads the one-time SSO exchange code from a URL hash fragment (`#code=...`).
 * Never log the returned value (opaque secret, TTL ~5 min, single use).
 */
export function readSsoExchangeCodeFromHash(
  hash: string | null | undefined
): string {
  if (typeof hash !== "string" || !hash) return ""
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw) return ""
  try {
    const params = new URLSearchParams(raw)
    return params.get("code")?.trim() ?? ""
  } catch {
    return ""
  }
}

/**
 * Builds a same-document URL for history.replaceState without hash and without
 * a leaked `code` query param (legacy redirects). Preserves other search params.
 */
export function stripSsoCodeFromLocationUrl(
  href: string,
  pathname: string,
  search: string
): string {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  )
  params.delete("code")
  const qs = params.toString()
  try {
    const url = new URL(href)
    return `${url.origin}${pathname}${qs ? `?${qs}` : ""}`
  } catch {
    return `${pathname}${qs ? `?${qs}` : ""}`
  }
}
