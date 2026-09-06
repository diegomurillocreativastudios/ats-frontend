import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { fetchBackendSessionUser } from "@/lib/fetch-backend-session-user"
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
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const baseUrl = getServerBackendBaseUrl()
  if (!baseUrl) {
    return NextResponse.json(
      { message: "Servicio no disponible" },
      { status: 503 }
    )
  }

  const result = await fetchBackendSessionUser(baseUrl, accessToken)

  if (result.status === "ok") {
    return NextResponse.json(result.user)
  }

  if (result.status === "unauthenticated") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  return NextResponse.json(
    { message: "Servicio no disponible" },
    { status: 503 }
  )
}
