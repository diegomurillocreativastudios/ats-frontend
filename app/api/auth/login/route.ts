import { type NextRequest, NextResponse } from "next/server"
import {
  createAuthSessionResponse,
  extractBackendErrorMessage,
} from "@/lib/auth/server-auth-session"
import {
  applyPrivateNoStore,
  jsonWithPrivateNoStore,
} from "@/lib/security/cache-headers"
import { logServerError } from "@/lib/security/safe-server-log"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

const GENERIC_LOGIN_ERROR = "Error al iniciar sesión. Intenta de nuevo."

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return jsonWithPrivateNoStore(
        { message: "Email y contraseña son requeridos" },
        { status: 400 }
      )
    }

    const baseUrl = getServerBackendBaseUrl()
    const res = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

    if (!res.ok) {
      const message = extractBackendErrorMessage(
        data,
        "Correo o contraseña incorrectos."
      )
      const headers = new Headers()
      const retryAfter = res.headers.get("retry-after")
      if (retryAfter) headers.set("retry-after", retryAfter)
      return applyPrivateNoStore(
        NextResponse.json({ message }, { status: res.status, headers })
      )
    }

    return createAuthSessionResponse(baseUrl, data, {
      fallbackEmail: String(email || "").trim(),
    })
  } catch (err: unknown) {
    logServerError("auth-login", err)
    return jsonWithPrivateNoStore(
      { message: GENERIC_LOGIN_ERROR },
      { status: 500 }
    )
  }
}
