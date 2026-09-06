import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import { assertMutationCsrf } from "@/lib/auth/csrf"
import { isPublicPath } from "@/lib/auth/public-paths"
import {
  PORTAL_HOME_HREF,
  PORTAL_SELECTION_PATH,
} from "@/lib/portal-access"
import {
  applySecurityHeaders,
  generateCspNonce,
} from "@/lib/security/security-headers"

const AUTH_ROUTE = "/auth/iniciar-sesion"
const SSO_SUCCESS_PATH = "/auth/sso/success"
const CANDIDATE_HOME = PORTAL_HOME_HREF.candidate

/**
 * Continues the chain with security headers and per-request CSP nonce
 * stamped on both the request (for Next script sealing) and the response.
 */
function nextWithSecurity(request: NextRequest, nonce: string): NextResponse {
  const requestHeaders = new Headers(request.headers)
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  return applySecurityHeaders(response, {
    request,
    requestHeaders,
    nonce,
  })
}

/**
 * Redirect/rewrite/JSON responses: security headers on the response only
 * (no request CSP; Next does not render HTML for these).
 */
function secureResponse(
  request: NextRequest,
  response: NextResponse,
  nonce: string
): NextResponse {
  return applySecurityHeaders(response, { request, nonce })
}

/**
 * Edge proxy: auth gate by access-token presence only.
 * Role-based portal isolation lives in server layouts (backend session).
 * FE-SEC-010: defensive headers + Content Security Policy with nonce.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const nonce = generateCspNonce()

  const csrf = assertMutationCsrf(request)
  if (csrf.ok === false) {
    return secureResponse(
      request,
      NextResponse.json(
        { message: csrf.message },
        { status: csrf.status }
      ),
      nonce
    )
  }

  const hasToken = Boolean(request.cookies.get(AUTH_COOKIES.access)?.value)

  if (pathname === "/iniciar-sesion" || pathname === "/login") {
    const dest = new URL("/auth/iniciar-sesion", request.url)
    dest.search = request.nextUrl.search
    return secureResponse(request, NextResponse.redirect(dest), nonce)
  }
  if (pathname === "/crear-cuenta") {
    return secureResponse(
      request,
      NextResponse.redirect(new URL("/auth/registrarse", request.url)),
      nonce
    )
  }
  if (pathname === "/restablecer-contrasena") {
    const dest = new URL("/auth/restablecer-contrasena", request.url)
    dest.search = request.nextUrl.search
    return secureResponse(request, NextResponse.redirect(dest), nonce)
  }
  if (
    pathname === "/auth/forgot-password" ||
    pathname.startsWith("/auth/forgot-password/")
  ) {
    const dest = new URL("/auth/olvidaste-tu-contrasena", request.url)
    dest.search = request.nextUrl.search
    return secureResponse(request, NextResponse.redirect(dest), nonce)
  }

  if (pathname === "/mi-perfil" || pathname.startsWith("/mi-perfil/")) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/mi-perfil/, `${CANDIDATE_HOME}/mi-perfil`)
    return secureResponse(request, NextResponse.redirect(url), nonce)
  }

  if (
    pathname === SSO_SUCCESS_PATH ||
    pathname.startsWith(`${SSO_SUCCESS_PATH}/`)
  ) {
    /**
     * `/auth/sso/success/` would otherwise 308 to the canonical path.
     * A trailing-slash redirect can drop `#code=` (the hash never reaches
     * the server; Refresh/Location fallbacks often omit it).
     */
    if (pathname !== SSO_SUCCESS_PATH) {
      const dest = new URL(SSO_SUCCESS_PATH, request.nextUrl.origin)
      dest.search = request.nextUrl.search
      return secureResponse(request, NextResponse.rewrite(dest), nonce)
    }
    return nextWithSecurity(request, nonce)
  }

  const isAuthPage =
    pathname === "/auth/iniciar-sesion" ||
    pathname === "/auth/registrarse" ||
    pathname.startsWith("/auth/olvidaste-tu-contrasena") ||
    pathname === "/recuperar-contrasena"

  /**
   * NO incluir /auth/restablecer-contrasena: el enlace del mail debe abrirse aunque
   * el usuario tenga cookie de sesión (si no, el proxy redirige a seleccion-portal
   * y nunca ve el formulario de nueva contraseña).
   */
  if (hasToken && isAuthPage) {
    return secureResponse(
      request,
      NextResponse.redirect(new URL(PORTAL_SELECTION_PATH, request.url)),
      nonce
    )
  }

  if (pathname === "/" && hasToken) {
    return secureResponse(
      request,
      NextResponse.redirect(new URL(PORTAL_SELECTION_PATH, request.url)),
      nonce
    )
  }

  if (pathname === PORTAL_SELECTION_PATH && hasToken) {
    return nextWithSecurity(request, nonce)
  }

  if (isPublicPath(pathname)) {
    return nextWithSecurity(request, nonce)
  }

  if (!hasToken) {
    const loginUrl = new URL(AUTH_ROUTE, request.url)
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", `${pathname}${request.nextUrl.search}`)
    }
    return secureResponse(request, NextResponse.redirect(loginUrl), nonce)
  }

  return nextWithSecurity(request, nonce)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|chromium-pack\\.tar|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|tar)$).*)",
  ],
}
