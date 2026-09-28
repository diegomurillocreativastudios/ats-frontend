import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import {
  applyPrivateNoStore,
  jsonWithPrivateNoStore,
} from "@/lib/security/cache-headers"
import { publicApiErrorBody } from "@/lib/security/public-api-error"
import { logServerError } from "@/lib/security/safe-server-log"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import {
  getUploadMaxBytesForBackendPath,
  isBoundedBodyTooLarge,
  readRequestBodyWithinLimit,
} from "@/lib/upload-body-limit"

const GENERIC_PHOTO_GET_ERROR = "No se pudo cargar la foto."
const GENERIC_PHOTO_PUT_ERROR = "No se pudo actualizar la foto."
const GENERIC_PHOTO_DELETE_ERROR = "No se pudo eliminar la foto."
const PHOTO_BACKEND_PATH = "/api/auth/profile/photo"
const TOKEN_KEYS = new Set([
  "accessToken",
  "refreshToken",
  "token",
  "tokenType",
  "expiresIn",
  "access_token",
  "refresh_token",
])

function omitAuthSecrets(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (TOKEN_KEYS.has(key)) continue
    out[key] = value
  }
  return out
}

function readAccessToken(request: NextRequest): string | null {
  return request.cookies.get(AUTH_COOKIES.access)?.value ?? null
}

function retryAfterHeaders(source: Headers): Headers {
  const headers = new Headers()
  const retryAfter = source.get("retry-after")
  if (retryAfter) headers.set("retry-after", retryAfter)
  return headers
}

/**
 * Self-service: the authenticated recruiter or admin only reads their own photo.
 */
export async function GET(request: NextRequest) {
  const accessToken = readAccessToken(request)
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

  try {
    const res = await fetch(`${baseUrl}${PHOTO_BACKEND_PATH}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return jsonWithPrivateNoStore(
        publicApiErrorBody(res.status, data, GENERIC_PHOTO_GET_ERROR),
        { status: res.status }
      )
    }

    return jsonWithPrivateNoStore(omitAuthSecrets(data))
  } catch (err: unknown) {
    logServerError("auth-profile-photo-get", err)
    return jsonWithPrivateNoStore(
      { message: GENERIC_PHOTO_GET_ERROR },
      { status: 502 }
    )
  }
}

/**
 * Self-service: multipart field `photo`. Never accepts another user id.
 */
export async function PUT(request: NextRequest) {
  const accessToken = readAccessToken(request)
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

  const maxBytes = getUploadMaxBytesForBackendPath(PHOTO_BACKEND_PATH)
  const bounded = await readRequestBodyWithinLimit(request, maxBytes)
  if (isBoundedBodyTooLarge(bounded)) {
    return jsonWithPrivateNoStore(
      { message: bounded.message },
      { status: bounded.status }
    )
  }
  if (bounded.body.byteLength === 0) {
    return jsonWithPrivateNoStore(
      { message: "La foto es obligatoria." },
      { status: 400 }
    )
  }

  try {
    const forwardHeaders = new Headers()
    forwardHeaders.set("Authorization", `Bearer ${accessToken}`)
    forwardHeaders.set("Accept", "application/json")
    const contentType = request.headers.get("content-type")
    if (contentType) {
      forwardHeaders.set("Content-Type", contentType)
    }

    const res = await fetch(`${baseUrl}${PHOTO_BACKEND_PATH}`, {
      method: "PUT",
      headers: forwardHeaders,
      body: bounded.body,
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const headers = retryAfterHeaders(res.headers)
    if (!res.ok) {
      return jsonWithPrivateNoStore(
        publicApiErrorBody(res.status, data, GENERIC_PHOTO_PUT_ERROR),
        { status: res.status, headers }
      )
    }

    return jsonWithPrivateNoStore(omitAuthSecrets(data), { headers })
  } catch (err: unknown) {
    logServerError("auth-profile-photo-put", err)
    return jsonWithPrivateNoStore(
      { message: GENERIC_PHOTO_PUT_ERROR },
      { status: 502 }
    )
  }
}

/**
 * Self-service: removes the authenticated user's photo only.
 */
export async function DELETE(request: NextRequest) {
  const accessToken = readAccessToken(request)
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

  try {
    const res = await fetch(`${baseUrl}${PHOTO_BACKEND_PATH}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const headers = retryAfterHeaders(res.headers)
    if (res.status === 204) {
      return applyPrivateNoStore(new NextResponse(null, { status: 204, headers }))
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return jsonWithPrivateNoStore(
      publicApiErrorBody(res.status, data, GENERIC_PHOTO_DELETE_ERROR),
      { status: res.status, headers }
    )
  } catch (err: unknown) {
    logServerError("auth-profile-photo-delete", err)
    return jsonWithPrivateNoStore(
      { message: GENERIC_PHOTO_DELETE_ERROR },
      { status: 502 }
    )
  }
}
