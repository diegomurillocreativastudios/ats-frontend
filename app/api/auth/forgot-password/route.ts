import { NextResponse, type NextRequest } from "next/server"
import { getApiErrorMessage } from "@/lib/api-error"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

const isDev = process.env.NODE_ENV === "development"

const GENERIC_FORGOT_MESSAGE =
  "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña."

const ACCOUNT_MISSING_MESSAGE_RE =
  /not\s*found|no\s*(encontrad[oa]|existe)|email\s*not\s*found|cuenta\s*no\s*existe|user\s*not\s*found|does\s*not\s*exist/i

/**
 * Detecta respuestas del backend que revelan si el correo está registrado.
 * Solo normalizamos 404 y 400 de enumeración; 429/5xx y validación propia se reenvían.
 */
function isAccountMissingEnumeration(
  status: number,
  data: Record<string, unknown>,
): boolean {
  if (status === 404) return true
  if (status !== 400) return false

  if ("exists" in data || "success" in data) return true

  const raw = data.message ?? data.detail ?? data.Message
  const text = Array.isArray(raw) ? raw[0] : raw
  if (typeof text !== "string") return false
  return ACCOUNT_MISSING_MESSAGE_RE.test(text)
}

function genericForgotResponse() {
  return NextResponse.json({ message: GENERIC_FORGOT_MESSAGE })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim() : ""

    if (!email) {
      return NextResponse.json(
        { message: "El correo electrónico es requerido" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Correo electrónico inválido" },
        { status: 400 }
      )
    }

    const baseUrl = getServerBackendBaseUrl()
    if (!baseUrl) {
      return NextResponse.json(
        {
          message:
            "El servicio no está configurado. Definí NEXT_PUBLIC_API_URL o API_URL (backend en red accesible desde Next.js).",
        },
        { status: 503 }
      )
    }

    const res = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    if (isDev) {
      console.info("[forgot-password] backend HTTP", res.status)
    }

    if (!res.ok) {
      if (isAccountMissingEnumeration(res.status, data)) {
        return genericForgotResponse()
      }

      if (isDev) {
        console.warn("[forgot-password] backend error body", data)
      }
      const raw =
        data.message ??
        data.detail ??
        "No se pudo procesar la solicitud."
      const text = Array.isArray(raw) ? raw[0] : raw
      const headers = new Headers()
      const retryAfter = res.headers.get("retry-after")
      if (retryAfter) headers.set("retry-after", retryAfter)
      return NextResponse.json(
        { message: typeof text === "string" ? text : String(text) },
        { status: res.status, headers }
      )
    }

    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.Message === "string"
          ? data.Message
          : GENERIC_FORGOT_MESSAGE

    return NextResponse.json({ message })
  } catch (err: unknown) {
    return NextResponse.json(
      {
        message:
          getApiErrorMessage(err) || "Error al procesar la solicitud. Intenta de nuevo.",
      },
      { status: 500 }
    )
  }
}
