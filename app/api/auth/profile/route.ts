import { type NextRequest } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import {
  buildRecruiterProfilePatchBody,
  parseRecruiterProfilePatchBody,
} from "@/lib/rrhh/recruiter-display-name"
import { jsonWithPrivateNoStore } from "@/lib/security/cache-headers"
import { publicApiErrorBody } from "@/lib/security/public-api-error"
import { logServerError } from "@/lib/security/safe-server-log"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

const GENERIC_PROFILE_ERROR = "No se pudo guardar el perfil."
const TOKEN_KEYS = new Set([
  "accessToken",
  "refreshToken",
  "token",
  "tokenType",
  "expiresIn",
  "access_token",
  "refresh_token",
])

/**
 * Quita secretos de sesión si el backend los mandara por error.
 */
function omitAuthSecrets(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (TOKEN_KEYS.has(key)) continue
    out[key] = value
  }
  return out
}

/**
 * Self-service: el usuario autenticado solo se actualiza a sí mismo.
 * No usar `PATCH /api/admin/users/{id}` (admin-only y no acepta nombre).
 */
export async function PATCH(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIES.access)?.value
  if (!accessToken) {
    return jsonWithPrivateNoStore({ message: "No autorizado" }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return jsonWithPrivateNoStore(
      { message: "El nombre es obligatorio." },
      { status: 400 }
    )
  }

  const parsed = parseRecruiterProfilePatchBody(raw)
  if (parsed.ok === false) {
    return jsonWithPrivateNoStore({ message: parsed.message }, { status: 400 })
  }

  const baseUrl = getServerBackendBaseUrl()
  if (!baseUrl) {
    return jsonWithPrivateNoStore(
      { message: "Servicio no disponible" },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${baseUrl}/api/auth/profile`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildRecruiterProfilePatchBody(parsed.userName)),
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const headers = new Headers()
    const retryAfter = res.headers.get("retry-after")
    if (retryAfter) headers.set("retry-after", retryAfter)

    if (!res.ok) {
      return jsonWithPrivateNoStore(
        publicApiErrorBody(res.status, data, GENERIC_PROFILE_ERROR),
        { status: res.status, headers }
      )
    }

    return jsonWithPrivateNoStore(omitAuthSecrets(data), { headers })
  } catch (err: unknown) {
    logServerError("auth-profile", err)
    return jsonWithPrivateNoStore(
      { message: GENERIC_PROFILE_ERROR },
      { status: 502 }
    )
  }
}
