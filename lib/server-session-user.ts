import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_COOKIES } from "@/lib/auth"
import {
  fetchBackendSessionUser,
  type BackendSessionLookupResult,
  type BackendSessionUserPayload,
} from "@/lib/fetch-backend-session-user"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import { isAdminRole, isCandidateRole, isRecruiterRole } from "@/lib/roles"

export type { BackendSessionUserPayload, BackendSessionLookupResult }

/**
 * Lookup de sesión fail-closed: solo `/api/auth/session` con el access token.
 * Nunca lee identidad ni rol desde la cookie `ats_user`.
 */
export async function lookupServerSession(): Promise<BackendSessionLookupResult> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) return { status: "unauthenticated" }

  const baseUrl = getServerBackendBaseUrl()
  if (!baseUrl) return { status: "unavailable" }

  return fetchBackendSessionUser(baseUrl, accessToken)
}

/**
 * Usuario de sesión en el servidor. Sin redirecciones.
 * Solo retorna usuario cuando el backend confirma la sesión.
 */
export async function getServerSessionUser(): Promise<BackendSessionUserPayload | null> {
  const result = await lookupServerSession()
  return result.status === "ok" ? result.user : null
}

function redirectForSessionFailure(
  result: Exclude<BackendSessionLookupResult, { status: "ok" }>
): never {
  if (result.status === "unavailable") {
    redirect("/auth/iniciar-sesion?error=service-unavailable")
  }
  redirect("/auth/iniciar-sesion")
}

/** Exige sesión y rol admin; redirige a login o selección de portal. */
export async function requirePortalAdminUser(): Promise<BackendSessionUserPayload> {
  const result = await lookupServerSession()
  if (result.status !== "ok") redirectForSessionFailure(result)
  if (!isAdminRole(result.user.role)) redirect("/seleccion-portal")
  return result.user
}

/**
 * Exige sesión de candidato (o admin). Recruiter sin admin → selección de portal.
 */
export async function requirePortalCandidateUser(): Promise<BackendSessionUserPayload> {
  const result = await lookupServerSession()
  if (result.status !== "ok") redirectForSessionFailure(result)
  const { role } = result.user
  if (!isAdminRole(role) && !isCandidateRole(role)) {
    redirect("/seleccion-portal")
  }
  return result.user
}

/**
 * Exige sesión de reclutador / Recursos Humanos (o admin).
 */
export async function requirePortalRecruiterUser(): Promise<BackendSessionUserPayload> {
  const result = await lookupServerSession()
  if (result.status !== "ok") redirectForSessionFailure(result)
  const { role } = result.user
  if (!isAdminRole(role) && !isRecruiterRole(role)) {
    redirect("/seleccion-portal")
  }
  return result.user
}
