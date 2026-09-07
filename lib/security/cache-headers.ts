import { NextResponse } from "next/server"

/** Canonical Cache-Control for session, PII, PDF, and private HTML (FE-SEC-024). */
export const PRIVATE_NO_STORE_CACHE_CONTROL = "private, no-store"

/**
 * Paths that must never be shared via CDN/browser HTTP cache.
 * Public marketing pages and hashed static assets are excluded.
 */
export function shouldApplyPrivateNoStore(pathname: string): boolean {
  if (!pathname) return false
  if (pathname.startsWith("/_next")) return false
  if (pathname.startsWith("/api/")) return true
  if (pathname.startsWith("/auth/")) return true
  if (
    pathname === "/seleccion-portal" ||
    pathname.startsWith("/seleccion-portal/")
  ) {
    return true
  }
  if (pathname.startsWith("/portal-rrhh")) return true
  if (pathname.startsWith("/portal-candidato")) return true
  if (pathname.startsWith("/portal-admin")) return true
  return false
}

/**
 * Sets `Cache-Control: private, no-store` on a response or Headers object.
 */
export function applyPrivateNoStore<T extends Headers | NextResponse>(
  target: T
): T {
  if (target instanceof Headers) {
    target.set("Cache-Control", PRIVATE_NO_STORE_CACHE_CONTROL)
    return target
  }
  target.headers.set("Cache-Control", PRIVATE_NO_STORE_CACHE_CONTROL)
  return target
}

/**
 * JSON response with private no-store (session / PII API handlers).
 */
export function jsonWithPrivateNoStore(
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return applyPrivateNoStore(NextResponse.json(body, init))
}
