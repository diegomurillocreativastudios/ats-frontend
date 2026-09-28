import { NextResponse, type NextRequest } from "next/server"
import { publicApiErrorBody } from "@/lib/security/public-api-error"
import { logServerError } from "@/lib/security/safe-server-log"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

const GENERIC_RESET_ERROR =
  "No se pudo restablecer la contraseña. Intenta de nuevo."

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token =
      typeof body.token === "string" ? body.token.trim() : ""
    const password =
      typeof body.password === "string" ? body.password : ""

    if (!token) {
      return NextResponse.json(
        {
          message:
            "Se requiere un token de recuperación válido.",
        },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { message: "La contraseña es requerida" },
        { status: 400 }
      )
    }

    const baseUrl = getServerBackendBaseUrl()
    if (!baseUrl) {
      return NextResponse.json(
        {
          message:
            "El servicio de restablecimiento no está configurado. Definí NEXT_PUBLIC_API_URL o API_URL.",
        },
        { status: 503 }
      )
    }

    const res = await fetch(`${baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, token }),
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    if (!res.ok) {
      const headers = new Headers()
      const retryAfter = res.headers.get("retry-after")
      if (retryAfter) headers.set("retry-after", retryAfter)
      return NextResponse.json(
        publicApiErrorBody(res.status, data, GENERIC_RESET_ERROR),
        { status: res.status, headers }
      )
    }

    return NextResponse.json({
      ok: true,
      ...data,
    })
  } catch (err: unknown) {
    logServerError("reset-password", err)
    return NextResponse.json(
      { message: GENERIC_RESET_ERROR },
      { status: 500 }
    )
  }
}
