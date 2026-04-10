import { NextResponse, type NextRequest } from "next/server"
import { getApiErrorMessage } from "@/lib/api-error"

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || ""

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token =
      typeof body.token === "string" ? body.token.trim() : ""
    const email =
      typeof body.email === "string" ? body.email.trim() : ""
    const password =
      typeof body.password === "string" ? body.password : ""

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const hasValidEmail = email.length > 0 && emailRegex.test(email)

    /**
     * Misma regla que el API: con token no vacío → solo { password, token } (email no se envía).
     * Sin token → { password, email } (flujo solo correo; el backend no exige token previo en BD).
     * Nunca mezclar ambos en el mismo payload: si llegaran, el API priorizaría token.
     */
    if (!token && !hasValidEmail) {
      return NextResponse.json(
        {
          message:
            "Debés indicar un correo verificado o un token de recuperación válido.",
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

    if (password.length < 8) {
      return NextResponse.json(
        { message: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      )
    }

    const baseUrl = getBaseUrl().replace(/\/$/, "")
    if (!baseUrl) {
      return NextResponse.json(
        {
          message:
            "El servicio de restablecimiento no está configurado. Contactá al administrador.",
        },
        { status: 503 }
      )
    }

    const payload = token
      ? { password, token }
      : { password, email }

    const res = await fetch(`${baseUrl}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    if (!res.ok) {
      const raw =
        data.message ??
        data.detail ??
        "No se pudo restablecer la contraseña."
      const text = Array.isArray(raw) ? raw[0] : raw
      const msg = typeof text === "string" ? text : String(text)
      return NextResponse.json({ message: msg }, { status: res.status })
    }

    return NextResponse.json({
      ok: true,
      ...data,
    })
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
