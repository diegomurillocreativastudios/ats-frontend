import { NextResponse, type NextRequest } from "next/server"
import { getApiErrorMessage } from "@/lib/api-error"

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || ""

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

    const baseUrl = getBaseUrl().replace(/\/$/, "")
    if (!baseUrl) {
      return NextResponse.json(
        {
          message:
            "El servicio no está configurado. Verificá NEXT_PUBLIC_API_URL.",
        },
        { status: 503 }
      )
    }

    const res = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >

    if (!res.ok) {
      const raw =
        data.message ??
        data.detail ??
        "No se pudo procesar la solicitud."
      const text = Array.isArray(raw) ? raw[0] : raw
      return NextResponse.json(
        { message: typeof text === "string" ? text : String(text) },
        { status: res.status }
      )
    }

    const exists = Boolean(data.exists ?? data.Exists)
    const success = Boolean(data.success ?? data.Success)
    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.Message === "string"
          ? data.Message
          : ""

    return NextResponse.json({
      exists,
      success,
      message,
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
