import { NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import { GOOGLE_CALENDAR_API } from "@/lib/google-calendar"

function calendarSettingsUrl(request: NextRequest, query: Record<string, string>) {
  const u = new URL(
    "/portal-rrhh/configuracion/calendario",
    request.nextUrl.origin
  )
  for (const [k, v] of Object.entries(query)) {
    u.searchParams.set(k, v)
  }
  return u
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state") ?? ""
  const oauthError = searchParams.get("error")

  if (oauthError) {
    const errorDescription =
      searchParams.get("error_description") ?? oauthError
    return NextResponse.redirect(
      calendarSettingsUrl(request, { error: errorDescription })
    )
  }

  if (!code) {
    return NextResponse.redirect(
      calendarSettingsUrl(request, { error: "missing_code" })
    )
  }

  const token = request.cookies.get(AUTH_COOKIES.access)?.value
  if (!token) {
    return NextResponse.redirect(
      calendarSettingsUrl(request, {
        error: "Sesión expirada. Iniciá sesión de nuevo e intentá conectar el calendario.",
      })
    )
  }

  try {
    const baseUrl = getServerBackendBaseUrl()
    const res = await fetch(`${baseUrl}${GOOGLE_CALENDAR_API.callback}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code, state }),
      cache: "no-store",
    })

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean
      message?: string
      error?: string
    }

    if (res.ok && data.success !== false) {
      return NextResponse.redirect(
        calendarSettingsUrl(request, { success: "true" })
      )
    }

    const message =
      data.message ||
      data.error ||
      (typeof data === "object" && data !== null
        ? JSON.stringify(data)
        : `Error ${res.status}`)
    return NextResponse.redirect(
      calendarSettingsUrl(request, { error: message })
    )
  } catch (error) {
    console.error("[OAuth Callback] Error:", error)
    const message =
      error instanceof Error ? error.message : "Callback failed"
    return NextResponse.redirect(
      calendarSettingsUrl(request, { error: message })
    )
  }
}
