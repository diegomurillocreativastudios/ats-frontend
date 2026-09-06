import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import { assertMutationCsrf } from "@/lib/auth/csrf"
import { isPublicPath } from "@/lib/auth/public-paths"
import {
  PORTAL_HOME_HREF,
  PORTAL_SELECTION_PATH,
} from "@/lib/portal-access"

const AUTH_ROUTE = "/auth/iniciar-sesion"
const SSO_SUCCESS_PATH = "/auth/sso/success"
const CANDIDATE_HOME = PORTAL_HOME_HREF.candidate

/**
 * Edge proxy: auth gate by access-token presence only.
 * Role-based portal isolation lives in server layouts (backend session).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const csrf = assertMutationCsrf(request)
  if (csrf.ok === false) {
    return NextResponse.json(
      { message: csrf.message },
      { status: csrf.status }
    )
  }

  const hasToken = Boolean(request.cookies.get(AUTH_COOKIES.access)?.value)

  if (pathname === "/iniciar-sesion" || pathname === "/login") {
    const dest = new URL("/auth/iniciar-sesion", request.url)
    dest.search = request.nextUrl.search
    return NextResponse.redirect(dest)
  }
  if (pathname === "/crear-cuenta") {
    return NextResponse.redirect(new URL("/auth/registrarse", request.url))
  }
  if (pathname === "/restablecer-contrasena") {
    const dest = new URL("/auth/restablecer-contrasena", request.url)
    dest.search = request.nextUrl.search
    return NextResponse.redirect(dest)
  }
  if (
    pathname === "/auth/forgot-password" ||
    pathname.startsWith("/auth/forgot-password/")
  ) {
    const dest = new URL("/auth/olvidaste-tu-contrasena", request.url)
    dest.search = request.nextUrl.search
    return NextResponse.redirect(dest)
  }

  if (pathname === "/mi-perfil" || pathname.startsWith("/mi-perfil/")) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/mi-perfil/, `${CANDIDATE_HOME}/mi-perfil`)
    return NextResponse.redirect(url)
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
      return NextResponse.rewrite(dest)
    }
    return NextResponse.next()
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
    return NextResponse.redirect(new URL(PORTAL_SELECTION_PATH, request.url))
  }

  if (pathname === "/" && hasToken) {
    return NextResponse.redirect(new URL(PORTAL_SELECTION_PATH, request.url))
  }

  if (pathname === PORTAL_SELECTION_PATH && hasToken) {
    return NextResponse.next()
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (!hasToken) {
    const loginUrl = new URL(AUTH_ROUTE, request.url)
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", `${pathname}${request.nextUrl.search}`)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|chromium-pack\\.tar|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|tar)$).*)",
  ],
}
