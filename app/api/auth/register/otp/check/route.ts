import { NextResponse, type NextRequest } from "next/server"
import {
  isValidRegisterEmail,
  isValidRegisterOtpCode,
  normalizeRegisterEmail,
  REGISTER_OTP_CHECK_OK_MESSAGE,
  REGISTER_OTP_GENERIC_ERROR,
  REGISTER_OTP_INVALID_CODE_MESSAGE,
} from "@/lib/auth/register-otp"
import { publicApiErrorBody } from "@/lib/security/public-api-error"
import {
  applyPrivateNoStore,
  jsonWithPrivateNoStore,
} from "@/lib/security/cache-headers"
import { logServerError } from "@/lib/security/safe-server-log"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const payload = body as Record<string, unknown>
    const email = normalizeRegisterEmail(payload.email)
    const code = typeof payload.code === "string" ? payload.code.trim() : ""

    if (!email || !isValidRegisterEmail(email) || !isValidRegisterOtpCode(code)) {
      return jsonWithPrivateNoStore(
        { message: REGISTER_OTP_GENERIC_ERROR },
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

    const res = await fetch(`${baseUrl}/auth/register/otp/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

    if (!res.ok) {
      const headers = new Headers()
      const retryAfter = res.headers.get("retry-after")
      if (retryAfter) headers.set("retry-after", retryAfter)

      if (res.status === 401) {
        return applyPrivateNoStore(
          NextResponse.json(
            { message: REGISTER_OTP_INVALID_CODE_MESSAGE },
            { status: 401, headers },
          ),
        )
      }

      return applyPrivateNoStore(
        NextResponse.json(
          publicApiErrorBody(res.status, data, REGISTER_OTP_GENERIC_ERROR),
          { status: res.status, headers },
        ),
      )
    }

    return jsonWithPrivateNoStore({ message: REGISTER_OTP_CHECK_OK_MESSAGE })
  } catch (err: unknown) {
    logServerError("register-otp-check", err)
    return jsonWithPrivateNoStore(
      { message: REGISTER_OTP_GENERIC_ERROR },
      { status: 500 },
    )
  }
}
