export const SSO_EXCHANGE_CODE_STORAGE_KEY = "ats.sso.exchangeCode"

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

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
}

/** Persists the exchange code so a remount after replaceState can recover it. */
export function persistSsoExchangeCode(code: string): void {
  if (!canUseSessionStorage()) return
  const trimmed = code.trim()
  if (!trimmed) return
  try {
    window.sessionStorage.setItem(SSO_EXCHANGE_CODE_STORAGE_KEY, trimmed)
  } catch {
    return
  }
}

export function readPersistedSsoExchangeCode(): string {
  if (!canUseSessionStorage()) return ""
  try {
    return window.sessionStorage.getItem(SSO_EXCHANGE_CODE_STORAGE_KEY)?.trim() ?? ""
  } catch {
    return ""
  }
}

export function clearPersistedSsoExchangeCode(): void {
  if (!canUseSessionStorage()) return
  try {
    window.sessionStorage.removeItem(SSO_EXCHANGE_CODE_STORAGE_KEY)
  } catch {
    return
  }
}

/**
 * Prefers `#code=` (and persists it), then falls back to sessionStorage.
 * Use this after a remount or after Next.js strips the hash from the URL.
 */
export function resolveSsoExchangeCode(hash: string | null | undefined): string {
  const fromHash = readSsoExchangeCodeFromHash(hash)
  if (fromHash) {
    persistSsoExchangeCode(fromHash)
    return fromHash
  }
  return readPersistedSsoExchangeCode()
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
