const DEFAULT_AUTH_REDIRECT = "/seleccion-portal"

/**
 * Dummy origin for resolving relative paths. Only used to detect when a value
 * escapes same-origin (protocol-relative, absolute URL, userinfo, etc.).
 */
const CANONICAL_ORIGIN = "https://ats.invalid"

/**
 * Normalize a candidate post-auth redirect to a same-origin path (+ query).
 * Rejects protocol-relative URLs, schemes, backslashes, and encoded escapes
 * that leave the canonical origin after URL parsing.
 */
export function normalizeInternalPath(
  value: string | null | undefined
): string | null {
  if (!value || typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith("/")) return null
  if (trimmed.startsWith("//")) return null
  if (trimmed.includes("\\")) return null
  if (trimmed.includes("://")) return null
  if (trimmed.includes("@")) return null

  let parsed: URL
  try {
    parsed = new URL(trimmed, CANONICAL_ORIGIN)
  } catch {
    return null
  }

  if (parsed.origin !== CANONICAL_ORIGIN) return null
  if (parsed.username || parsed.password) return null

  let decodedPathname: string
  try {
    decodedPathname = decodeURIComponent(parsed.pathname)
  } catch {
    return null
  }

  if (decodedPathname.includes("\\")) return null
  if (decodedPathname.includes("//")) return null

  return `${parsed.pathname}${parsed.search}`
}

/** True when value is a same-origin relative path (no open redirect). */
export function isInternalPath(value: string | null | undefined): value is string {
  return normalizeInternalPath(value) !== null
}

/** Pick the first safe internal redirect from candidates. */
export function resolveAuthRedirectDestination(
  candidates: Array<string | null | undefined>,
  defaultPath = DEFAULT_AUTH_REDIRECT
): string {
  for (const candidate of candidates) {
    const normalized = normalizeInternalPath(candidate)
    if (normalized) return normalized
  }
  return defaultPath
}

export { DEFAULT_AUTH_REDIRECT }
