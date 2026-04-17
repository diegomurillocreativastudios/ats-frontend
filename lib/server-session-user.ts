import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_COOKIES } from "@/lib/auth"
import { fetchBackendSessionUser } from "@/lib/fetch-backend-session-user"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import type { BackendSessionUserPayload } from "@/lib/fetch-backend-session-user"
import { isAdminRole } from "@/lib/roles"

export type { BackendSessionUserPayload }

/**
 * Usuario de sesión en el servidor (cookies + API session cuando hay base URL).
 * Sin redirecciones; para layouts públicos o selectores de portal.
 */
export async function getServerSessionUser(): Promise<BackendSessionUserPayload | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) return null

  const baseUrl = getServerBackendBaseUrl()
  if (baseUrl) {
    const fromBackend = await fetchBackendSessionUser(baseUrl, accessToken)
    if (fromBackend) return fromBackend
  }

  const userCookie = cookieStore.get(AUTH_COOKIES.user)?.value
  if (userCookie) {
    try {
      const u = JSON.parse(userCookie) as Record<string, unknown>
      const id = u.id != null ? String(u.id) : null
      const email = u.email != null ? String(u.email) : ""
      const nameRaw =
        u.name ?? u.userName ?? (email ? email.split("@")[0] : "") ?? ""
      const name = String(nameRaw).trim() || email || "Usuario"
      const rolesArr = Array.isArray(u.roles) ? u.roles : []
      const role =
        u.role != null && u.role !== ""
          ? String(u.role)
          : u.type != null && u.type !== ""
            ? String(u.type)
            : rolesArr.length > 0
              ? String(rolesArr[0])
              : null
      return { id, name, email, role }
    } catch {
      return null
    }
  }

  return null
}

/** Exige sesión y rol admin; redirige a login o selección de portal. */
export async function requirePortalAdminUser(): Promise<BackendSessionUserPayload> {
  const user = await getServerSessionUser()
  if (!user) redirect("/auth/iniciar-sesion")
  if (!isAdminRole(user.role)) redirect("/seleccion-portal")
  return user
}
