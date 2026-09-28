import { AUTH_COOKIES, getCsrfToken } from "@/lib/auth"
import { CSRF_HEADER } from "@/lib/auth/csrf-constants"

let inflight: Promise<string | null> | null = null

/**
 * Ensures a readable ats_csrf cookie exists; fetches one from the BFF if missing.
 */
export async function ensureCsrfToken(): Promise<string | null> {
  const existing = getCsrfToken()
  if (existing) return existing

  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await fetch("/api/auth/csrf", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) return null
      const data = (await res.json().catch(() => ({}))) as { token?: string }
      if (typeof data.token === "string" && data.token.trim()) {
        return data.token.trim()
      }
      return getCsrfToken()
    } catch {
      return null
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/**
 * Headers for same-origin mutations that require CSRF double-submit.
 */
export async function csrfHeaders(
  extra?: Record<string, string>
): Promise<Record<string, string>> {
  const token = await ensureCsrfToken()
  const headers: Record<string, string> = { ...(extra ?? {}) }
  if (token) {
    headers[CSRF_HEADER] = token
  }
  return headers
}

/** Cookie name re-export for tests / debugging. */
export const CSRF_COOKIE_NAME = AUTH_COOKIES.csrf
