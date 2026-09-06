import { NextResponse } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import {
  generateCsrfToken,
  setCsrfCookie,
} from "@/lib/auth/csrf"
import { fetchBackendSessionUser } from "@/lib/fetch-backend-session-user"
import { isInternalPath } from "@/lib/auth/internal-path"

export interface AuthUserPayload {
  id: string | null
  name: string
  email: string
  role: string | null
}

export interface ParsedBackendAuth {
  accessToken: string
  refreshToken: string | undefined
  expiresIn: number
  returnUrl: string | null
  userFromBackend: Record<string, unknown> | null
}

export function parseBackendAuthPayload(
  data: Record<string, unknown>
): ParsedBackendAuth | null {
  const accessToken =
    (typeof data.accessToken === "string" && data.accessToken) ||
    (typeof data.access_token === "string" && data.access_token) ||
    (typeof data.token === "string" && data.token) ||
    null

  if (!accessToken) return null

  const refreshToken =
    typeof data.refreshToken === "string" ? data.refreshToken : undefined
  const expiresIn = Number(data.expiresIn) || 3600
  const returnUrlRaw =
    typeof data.returnUrl === "string"
      ? data.returnUrl
      : typeof data.return_url === "string"
        ? data.return_url
        : null
  const returnUrl = isInternalPath(returnUrlRaw) ? returnUrlRaw.trim() : null
  const userFromBackend =
    data.user && typeof data.user === "object"
      ? (data.user as Record<string, unknown>)
      : null

  return {
    accessToken,
    refreshToken,
    expiresIn,
    returnUrl,
    userFromBackend,
  }
}

export function buildUserPayloadFromBackend(
  userFromBackend: Record<string, unknown> | null,
  fallbackEmail = ""
): AuthUserPayload {
  if (!userFromBackend) {
    return {
      id: null,
      name: "",
      email: fallbackEmail.trim(),
      role: null,
    }
  }

  const fullName =
    (typeof userFromBackend.name === "string" ? userFromBackend.name : undefined) ??
    (typeof userFromBackend.fullName === "string"
      ? userFromBackend.fullName
      : undefined) ??
    [userFromBackend.firstName, userFromBackend.lastName]
      .filter((part) => typeof part === "string" && part.trim() !== "")
      .join(" ")
      .trim()

  return {
    id: userFromBackend.id != null ? String(userFromBackend.id) : null,
    name: fullName || String(userFromBackend.email ?? "") || "",
    email: String(userFromBackend.email ?? fallbackEmail ?? ""),
    role:
      (userFromBackend.role as string | null | undefined) ??
      (userFromBackend.type as string | null | undefined) ??
      null,
  }
}

export async function createAuthSessionResponse(
  baseUrl: string,
  data: Record<string, unknown>,
  options: { fallbackEmail?: string; includeReturnUrl?: boolean } = {}
): Promise<NextResponse> {
  const parsed = parseBackendAuthPayload(data)
  if (!parsed) {
    return NextResponse.json(
      { message: "La respuesta del servidor no incluye token" },
      { status: 502 }
    )
  }

  const { accessToken, refreshToken, expiresIn, returnUrl, userFromBackend } =
    parsed
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn
  const isProd = process.env.NODE_ENV === "production"

  let userPayload = buildUserPayloadFromBackend(
    userFromBackend,
    options.fallbackEmail ?? ""
  )

  const hydrated = await fetchBackendSessionUser(baseUrl, accessToken)
  if (hydrated.status === "ok") {
    userPayload = {
      id: hydrated.user.id ?? userPayload.id,
      name: hydrated.user.name || userPayload.name || userPayload.email,
      email: hydrated.user.email || userPayload.email,
      role: hydrated.user.role ?? userPayload.role,
    }
  }

  const body: Record<string, unknown> = { success: true }
  if (options.includeReturnUrl && returnUrl) {
    body.returnUrl = returnUrl
  }

  const response = NextResponse.json(body)

  response.cookies.set(AUTH_COOKIES.access, accessToken, {
    path: AUTH_COOKIES.path,
    maxAge: expiresIn,
    sameSite: "lax",
    secure: isProd,
    httpOnly: true,
  })

  response.cookies.set(AUTH_COOKIES.expires, String(expiresAt), {
    path: AUTH_COOKIES.path,
    maxAge: expiresIn,
    sameSite: "lax",
    secure: isProd,
    httpOnly: false,
  })

  if (refreshToken) {
    response.cookies.set(AUTH_COOKIES.refresh, refreshToken, {
      path: AUTH_COOKIES.path,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: isProd,
      httpOnly: true,
    })
  }

  response.cookies.set(AUTH_COOKIES.user, JSON.stringify(userPayload), {
    path: AUTH_COOKIES.path,
    maxAge: expiresIn,
    sameSite: "lax",
    secure: isProd,
    httpOnly: false,
  })

  setCsrfCookie(response, generateCsrfToken(), {
    maxAge: Math.max(expiresIn, 60 * 60 * 24 * 7),
    isProd,
  })

  return response
}

export function extractBackendErrorMessage(
  data: unknown,
  fallback = "Solicitud fallida"
): string {
  if (typeof data === "string" && data.trim()) return data.trim()
  if (!data || typeof data !== "object" || Array.isArray(data)) return fallback
  const payload = data as Record<string, unknown>
  const message =
    (typeof payload.message === "string" && payload.message.trim()) ||
    (typeof payload.detail === "string" && payload.detail.trim()) ||
    (typeof payload.error === "string" && payload.error.trim()) ||
    (typeof payload.title === "string" && payload.title.trim()) ||
    fallback
  return Array.isArray(message) ? String(message[0]) : message
}

export function extractBackendErrorCode(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  const payload = data as Record<string, unknown>
  const code =
    (typeof payload.code === "string" && payload.code) ||
    (typeof payload.error === "string" && payload.error) ||
    null
  return code?.trim() || null
}
