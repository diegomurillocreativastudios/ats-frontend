import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import { isPublicPath } from "@/lib/auth/public-paths"

const AUTH_ROUTE = "/auth/iniciar-sesion"
const CANDIDATE_HOME = "/portal-candidato"
const RECRUITER_HOME = "/portal-rrhh"
const PORTAL_SELECTOR = "/seleccion-portal"

function normalizeRole(rawRole: string | null): "candidate" | "recruiter" | null {
  if (!rawRole) return null
  const role = rawRole.trim().toLowerCase()

  if (role.includes("candidate") || role.includes("candidato")) return "candidate"
  if (
    role.includes("recruiter") ||
    role.includes("rrhh") ||
    role.includes("human resources") ||
    role.includes("human_resources")
  ) {
    return "recruiter"
  }

  return null
}

function getSessionRole(request: NextRequest): "candidate" | "recruiter" | null {
  const userCookie = request.cookies.get(AUTH_COOKIES.user)?.value
  if (!userCookie) return null

  try {
    const parsed = JSON.parse(userCookie) as { role?: unknown; roles?: unknown }
    if (typeof parsed.role === "string") return normalizeRole(parsed.role)
    if (Array.isArray(parsed.roles) && typeof parsed.roles[0] === "string") {
      return normalizeRole(parsed.roles[0])
    }
  } catch {
    return null
  }

  return null
}

function getRoleHomePath(role: "candidate" | "recruiter" | null): string {
  if (role === "candidate") return CANDIDATE_HOME
  if (role === "recruiter") return RECRUITER_HOME
  return PORTAL_SELECTOR
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasToken = Boolean(request.cookies.get(AUTH_COOKIES.access)?.value)
  const role = getSessionRole(request)

  if (pathname === "/iniciar-sesion") {
    return NextResponse.redirect(new URL("/auth/iniciar-sesion", request.url))
  }
  if (pathname === "/crear-cuenta") {
    return NextResponse.redirect(new URL("/auth/registrarse", request.url))
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
    const dest = getRoleHomePath(role)
    return NextResponse.redirect(new URL(dest, request.url))
  }

  if (pathname === "/" && hasToken) {
    const dest = getRoleHomePath(role)
    return NextResponse.redirect(new URL(dest, request.url))
  }

  if (pathname === PORTAL_SELECTOR && hasToken && role) {
    const url = request.nextUrl.clone()
    url.pathname = getRoleHomePath(role)
    url.search = ""
    return NextResponse.redirect(url)
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
  const isMiPerfilRoute =
    pathname === "/mi-perfil" || pathname.startsWith("/mi-perfil/")

  if (isPortalCandidateRoute && role === "recruiter") {
    const url = request.nextUrl.clone()
    url.pathname = RECRUITER_HOME
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (isPortalRecruiterRoute && role === "candidate") {
    const url = request.nextUrl.clone()
    url.pathname = CANDIDATE_HOME
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (isMiPerfilRoute && role === "recruiter") {
    const url = request.nextUrl.clone()
    url.pathname = RECRUITER_HOME
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
