import { timingSafeEqual, randomBytes } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import {
  CSRF_COOKIE_MAX_AGE,
  CSRF_HEADER,
} from "@/lib/auth/csrf-constants"

export { CSRF_COOKIE_MAX_AGE, CSRF_HEADER }

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

/**
 * Generates a cryptographically random CSRF token (hex).
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Constant-time string equality for CSRF cookie vs header.
 */
export function csrfTokensEqual(a: string, b: string): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function isMutationMethod(method: string): boolean {
  return MUTATION_METHODS.has(method.toUpperCase())
}

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.host}`.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Allowed app origins: request host plus optional NEXT_PUBLIC_APP_URL.
 */
export function getAllowedOrigins(requestOrigin: string): Set<string> {
  const allowed = new Set<string>()
  const fromRequest = normalizeOrigin(requestOrigin)
  if (fromRequest) allowed.add(fromRequest)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl) {
    const fromEnv = normalizeOrigin(appUrl)
    if (fromEnv) allowed.add(fromEnv)
  }

  return allowed
}

/**
 * Resolves request origin from Origin header or Referer.
 */
export function resolveRequestOrigin(request: NextRequest): string | null {
  const originHeader = request.headers.get("origin")?.trim()
  if (originHeader) return normalizeOrigin(originHeader)

  const referer = request.headers.get("referer")?.trim()
  if (referer) return normalizeOrigin(referer)

  return null
}

/**
 * Sets the readable ats_csrf cookie on a response.
 */
export function setCsrfCookie(
  response: NextResponse,
  token: string,
  options: { maxAge?: number; isProd?: boolean } = {}
): void {
  const isProd = options.isProd ?? process.env.NODE_ENV === "production"
  response.cookies.set(AUTH_COOKIES.csrf, token, {
    path: AUTH_COOKIES.path,
    maxAge: options.maxAge ?? CSRF_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: isProd,
    httpOnly: false,
  })
}

/**
 * Clears the CSRF cookie.
 */
export function clearCsrfCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIES.csrf, "", {
    path: AUTH_COOKIES.path,
    maxAge: 0,
  })
}

export type CsrfCheckResult =
  | { ok: true }
  | { ok: false; status: number; message: string }

/**
 * Validates Origin/Referer, Fetch Metadata, and CSRF double-submit token
 * for cookie-authenticated mutations under /api/*.
 */
export function assertMutationCsrf(request: NextRequest): CsrfCheckResult {
  if (!isMutationMethod(request.method)) {
    return { ok: true }
  }

  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith("/api/")) {
    return { ok: true }
  }

  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase()
  if (secFetchSite === "cross-site") {
    return {
      ok: false,
      status: 403,
      message: "Solicitud cruzada no permitida",
    }
  }

  const allowed = getAllowedOrigins(request.nextUrl.origin)
  const requestOrigin = resolveRequestOrigin(request)

  // No Fetch Metadata: require Origin/Referer allowlist (covers older clients).
  if (!secFetchSite) {
    if (!requestOrigin || !allowed.has(requestOrigin)) {
      return {
        ok: false,
        status: 403,
        message: "Origen no permitido",
      }
    }
  } else if (requestOrigin && !allowed.has(requestOrigin)) {
    return {
      ok: false,
      status: 403,
      message: "Origen no permitido",
    }
  }

  const cookieToken = request.cookies.get(AUTH_COOKIES.csrf)?.value ?? ""
  const headerToken = request.headers.get(CSRF_HEADER)?.trim() ?? ""

  if (!csrfTokensEqual(cookieToken, headerToken)) {
    return {
      ok: false,
      status: 403,
      message: "Token CSRF inválido o ausente",
    }
  }

  return { ok: true }
}
