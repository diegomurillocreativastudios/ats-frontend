import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { clearAuthSessionCookies } from "@/lib/auth/clear-auth-session-cookies"
import {
  generateCsrfToken,
  setCsrfCookie,
} from "@/lib/auth/csrf"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

export async function POST() {
  const isProd = process.env.NODE_ENV === "production"

  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value

    if (!refreshToken) {
      const response = NextResponse.json(
        { message: "No hay refresh token" },
        { status: 401 }
      )
      clearAuthSessionCookies(response, { isProd })
      return response
    }

    const baseUrl = getServerBackendBaseUrl()
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const response = NextResponse.json(
        { message: data.message || data.detail || "Sesión expirada" },
        { status: res.status }
      )
      clearAuthSessionCookies(response, { isProd })
      return response
    }

    const accessToken = data.accessToken ?? data.token
    const newRefreshToken = data.refreshToken ?? refreshToken
    const expiresIn = Number(data.expiresIn) || 3600

    if (!accessToken) {
      const response = NextResponse.json(
        { message: "La respuesta del servidor no incluye token" },
        { status: 502 }
      )
      clearAuthSessionCookies(response, { isProd })
      return response
    }

    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn
    const response = NextResponse.json({ success: true })

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

    response.cookies.set(AUTH_COOKIES.refresh, newRefreshToken, {
      path: AUTH_COOKIES.path,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: isProd,
      httpOnly: true,
    })

    setCsrfCookie(response, generateCsrfToken(), {
      maxAge: Math.max(expiresIn, 60 * 60 * 24 * 7),
      isProd,
    })

    return response
  } catch (err: unknown) {
    const response = NextResponse.json(
      { message: getApiErrorMessage(err) || "Error al renovar sesión" },
      { status: 500 }
    )
    clearAuthSessionCookies(response, { isProd })
    return response
  }
}
