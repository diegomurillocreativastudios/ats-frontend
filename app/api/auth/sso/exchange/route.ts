import { NextResponse, type NextRequest } from "next/server"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  createAuthSessionResponse,
  extractBackendErrorCode,
  extractBackendErrorMessage,
} from "@/lib/auth/server-auth-session"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const code = typeof body.code === "string" ? body.code.trim() : ""

    if (!code) {
      return NextResponse.json(
        { message: "Código de inicio de sesión requerido", code: "missing_code" },
        { status: 400 }
      )
    }

    const baseUrl = getServerBackendBaseUrl()
    const res = await fetch(`${baseUrl}/api/auth/sso/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

    if (!res.ok) {
      const message = extractBackendErrorMessage(
        data,
        "No pudimos completar el inicio de sesión con LinkedIn"
      )
      const errorCode = extractBackendErrorCode(data)
      return NextResponse.json(
        {
          message,
          ...(errorCode ? { code: errorCode } : {}),
        },
        { status: res.status }
      )
    }

    return createAuthSessionResponse(baseUrl, data, {
      includeReturnUrl: true,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      {
        message:
          getApiErrorMessage(err) ||
          "No pudimos completar el inicio de sesión con LinkedIn",
        code: "network_error",
      },
      { status: 500 }
    )
  }
}
