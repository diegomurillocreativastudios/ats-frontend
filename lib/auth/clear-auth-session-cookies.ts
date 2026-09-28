import { NextResponse } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import { clearCsrfCookie } from "@/lib/auth/csrf"

/**
 * Clears all session cookies with the same path / SameSite / Secure attributes
 * used when they were set (FE-SEC-014).
 */
export function clearAuthSessionCookies(
  response: NextResponse,
  options: { isProd?: boolean } = {}
): void {
  const isProd = options.isProd ?? process.env.NODE_ENV === "production"
  const base = {
    path: AUTH_COOKIES.path,
    maxAge: 0,
    sameSite: "lax" as const,
    secure: isProd,
  }

  response.cookies.set(AUTH_COOKIES.access, "", {
    ...base,
    httpOnly: true,
  })
  response.cookies.set(AUTH_COOKIES.refresh, "", {
    ...base,
    httpOnly: true,
  })
  response.cookies.set(AUTH_COOKIES.expires, "", {
    ...base,
    httpOnly: false,
  })
  response.cookies.set(AUTH_COOKIES.user, "", {
    ...base,
    httpOnly: false,
  })
  clearCsrfCookie(response)
}
