/**
 * Auth helpers for session-based auth using cookies.
 * Backend returns: tokenType, accessToken, expiresIn, refreshToken.
 * Access token is HttpOnly; the browser must not read it.
 */

const COOKIE_ACCESS = "ats_access_token"
const COOKIE_REFRESH = "ats_refresh_token"
const COOKIE_EXPIRES = "ats_token_expires"
const COOKIE_USER = "ats_user"
const COOKIE_CSRF = "ats_csrf"
const COOKIE_PATH = "/"

/** Get a cookie value by name (client-side only; HttpOnly cookies are invisible). */
export const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

/**
 * @deprecated Access token is HttpOnly. Do not use on the client.
 * Kept only so mistaken imports fail closed (always null in the browser).
 */
export const getAccessToken = (): string | null => null

/** Get token expiry timestamp (seconds since epoch). */
export const getTokenExpiresAt = (): number | null => {
  const value = getCookie(COOKIE_EXPIRES)
  if (!value) return null
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Simple “is logged in” check on the client without reading the access token.
 * Uses the non-HttpOnly expiry or user cookie as a hint.
 */
export const hasAuth = (): boolean =>
  Boolean(getTokenExpiresAt() || getCookie(COOKIE_USER))

/**
 * Get current user from cookie (client-side only).
 * Set by login route when backend returns user, or by /api/auth/me.
 */
export const getCurrentUser = (): {
  id: string | null
  name: string
  email: string
  role?: string | null
} | null => {
  const raw = getCookie(COOKIE_USER)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Readable CSRF token for double-submit header. */
export const getCsrfToken = (): string | null => getCookie(COOKIE_CSRF)

/** Cookie names and path for API routes (server-side). */
export const AUTH_COOKIES = {
  access: COOKIE_ACCESS,
  refresh: COOKIE_REFRESH,
  expires: COOKIE_EXPIRES,
  user: COOKIE_USER,
  csrf: COOKIE_CSRF,
  path: COOKIE_PATH,
}
