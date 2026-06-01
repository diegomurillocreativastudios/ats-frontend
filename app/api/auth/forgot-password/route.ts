import { NextResponse, type NextRequest } from "next/server"
import { getApiErrorMessage } from "@/lib/api-error"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

const isDev = process.env.NODE_ENV === "development"

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
      console.info("[forgot-password] backend HTTP", res.status, {
        exists: data.exists ?? data.Exists,
        success: data.success ?? data.Success,
      })
    }

    if (!res.ok) {
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
