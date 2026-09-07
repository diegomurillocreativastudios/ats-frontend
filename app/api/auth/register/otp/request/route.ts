import { NextResponse, type NextRequest } from "next/server"
import {
  isValidRegisterEmail,
  normalizeRegisterEmail,
  REGISTER_OTP_REQUEST_ERROR,
  REGISTER_OTP_REQUEST_MESSAGE,
} from "@/lib/auth/register-otp"
import { publicApiErrorBody } from "@/lib/security/public-api-error"
import {
  applyPrivateNoStore,
  jsonWithPrivateNoStore,
} from "@/lib/security/cache-headers"
import { logServerError } from "@/lib/security/safe-server-log"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

function uniformRequestResponse() {
  return jsonWithPrivateNoStore({ message: REGISTER_OTP_REQUEST_MESSAGE })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = normalizeRegisterEmail(
      (body as Record<string, unknown>).email,
    )

    if (!email) {
      return jsonWithPrivateNoStore(
        { message: "El correo electrónico es requerido" },
        { status: 400 },
      )
    }

    if (!isValidRegisterEmail(email)) {
      return jsonWithPrivateNoStore(
        { message: "Correo electrónico inválido" },
        { status: 400 },
      )
    }

    const baseUrl = getServerBackendBaseUrl()
    if (!baseUrl) {
      return jsonWithPrivateNoStore(
        {
          message:
            "El servicio no está configurado. Definí NEXT_PUBLIC_API_URL o API_URL (backend en red accesible desde Next.js).",
        },
        { status: 503 },
      )
    }

    const res = await fetch(`${baseUrl}/auth/register/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

    if (!res.ok) {
      if (res.status === 429) {
        const headers = new Headers()
        const retryAfter = res.headers.get("retry-after")
        if (retryAfter) headers.set("retry-after", retryAfter)
        return applyPrivateNoStore(
          NextResponse.json(
            publicApiErrorBody(res.status, data, REGISTER_OTP_REQUEST_ERROR),
            { status: 429, headers },
          ),
        )
      }

      if (res.status >= 500) {
        return jsonWithPrivateNoStore(
          publicApiErrorBody(res.status, data, REGISTER_OTP_REQUEST_ERROR),
          { status: res.status },
        )
      }

      return uniformRequestResponse()
    }

    return uniformRequestResponse()
  } catch (err: unknown) {
    logServerError("register-otp-request", err)
    return jsonWithPrivateNoStore(
      { message: REGISTER_OTP_REQUEST_ERROR },
      { status: 500 },
    )
  }
}
