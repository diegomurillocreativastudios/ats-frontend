import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { clearAuthSessionCookies } from "@/lib/auth/clear-auth-session-cookies"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

const BACKEND_LOGOUT_TIMEOUT_MS = 4_000

/**
 * Ends the browser session and best-effort revokes the refresh family on the API.
 * Cookies are always cleared even if the backend is down (FE-SEC-014).
 */
export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value
  const isProd = process.env.NODE_ENV === "production"

  if (refreshToken) {
    try {
      const baseUrl = getServerBackendBaseUrl()
      if (baseUrl) {
        const controller = new AbortController()
        const timer = setTimeout(
          () => controller.abort(),
          BACKEND_LOGOUT_TIMEOUT_MS
        )
        try {
          await fetch(`${baseUrl}/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            cache: "no-store",
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timer)
        }
      }
    } catch {
      // fail-open: local session must still end
    }
  }

  const response = NextResponse.json({ success: true })
  clearAuthSessionCookies(response, { isProd })
  return response
}
