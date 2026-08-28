import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import { isPublicPath } from "@/lib/auth/public-paths"
import {
  PORTAL_HOME_HREF,
  PORTAL_SELECTION_PATH,
  resolvePostAuthPath,
  resolveSolePortalHref,
} from "@/lib/portal-access"
import { isCandidateRole, isRecruiterRole } from "@/lib/roles"

const AUTH_ROUTE = "/auth/iniciar-sesion"
const SSO_SUCCESS_PATH = "/auth/sso/success"
const CANDIDATE_HOME = PORTAL_HOME_HREF.candidate
const RECRUITER_HOME = PORTAL_HOME_HREF.rrhh

function getSessionRoleRaw(request: NextRequest): string | null {
  const userCookie = request.cookies.get(AUTH_COOKIES.user)?.value
  if (!userCookie) return null

  try {
    const parsed = JSON.parse(userCookie) as { role?: unknown; roles?: unknown }
    if (typeof parsed.role === "string") return parsed.role
    if (Array.isArray(parsed.roles) && typeof parsed.roles[0] === "string") {
      return parsed.roles[0]
    }
  } catch {
    return null
  }

  return null
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasToken = Boolean(request.cookies.get(AUTH_COOKIES.access)?.value)
  const rawRole = getSessionRoleRaw(request)
  const isCandidate = isCandidateRole(rawRole)
  const isRecruiter = isRecruiterRole(rawRole)

  if (pathname === "/iniciar-sesion" || pathname === "/login") {
    const dest = new URL("/auth/iniciar-sesion", request.url)
    dest.search = request.nextUrl.search
    return NextResponse.redirect(dest)
  }
  if (pathname === "/crear-cuenta") {
    return NextResponse.redirect(new URL("/auth/registrarse", request.url))
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
    pathname.startsWith("/auth/forgot-password") ||
    pathname === "/recuperar-contrasena"

  /**
   * NO incluir /auth/restablecer-contrasena: el enlace del mail debe abrirse aunque
   * el usuario tenga cookie de sesión (si no, el proxy redirige a seleccion-portal
   * y nunca ve el formulario de nueva contraseña).
   */
  if (hasToken && isAuthPage) {
    return NextResponse.redirect(
      new URL(resolvePostAuthPath(rawRole), request.url),
    )
  }

  if (pathname === "/" && hasToken) {
    return NextResponse.redirect(
      new URL(resolvePostAuthPath(rawRole), request.url),
    )
  }

  if (pathname === PORTAL_SELECTION_PATH && hasToken) {
    const solePortalHref = resolveSolePortalHref(rawRole)
    if (solePortalHref) {
      const url = request.nextUrl.clone()
      url.pathname = solePortalHref
      url.search = ""
      return NextResponse.redirect(url)
    }
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

  const isPortalCandidateRoute =
    pathname === CANDIDATE_HOME || pathname.startsWith(`${CANDIDATE_HOME}/`)
  const isPortalRecruiterRoute =
    pathname === RECRUITER_HOME || pathname.startsWith(`${RECRUITER_HOME}/`)
  if (isPortalCandidateRoute && isRecruiter) {
    const url = request.nextUrl.clone()
    url.pathname = RECRUITER_HOME
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (isPortalRecruiterRoute && isCandidate) {
    const url = request.nextUrl.clone()
    url.pathname = CANDIDATE_HOME
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|chromium-pack\\.tar|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|tar)$).*)",
  ],
}
