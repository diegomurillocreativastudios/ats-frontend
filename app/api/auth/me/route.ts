import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { fetchBackendSessionUser } from "@/lib/fetch-backend-session-user"
import { jsonWithPrivateNoStore } from "@/lib/security/cache-headers"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

/**
 * Identidad de sesión fail-closed: solo el backend.
 * Sin token → 401; backend caído / sin URL → 503; token rechazado → 401.
 * Nunca lee ni reutiliza la cookie `ats_user`.
 */
export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) {
    return jsonWithPrivateNoStore({ message: "No autorizado" }, { status: 401 })
  }

  const baseUrl = getServerBackendBaseUrl()
  if (!baseUrl) {
    return jsonWithPrivateNoStore(
      { message: "Servicio no disponible" },
      { status: 503 }
    )
  }

  const result = await fetchBackendSessionUser(baseUrl, accessToken)

  if (result.status === "ok") {
    return jsonWithPrivateNoStore(result.user)
  }

  if (result.status === "unauthenticated") {
    return jsonWithPrivateNoStore({ message: "No autorizado" }, { status: 401 })
  }

  return jsonWithPrivateNoStore(
    { message: "Servicio no disponible" },
    { status: 503 }
  )
}
