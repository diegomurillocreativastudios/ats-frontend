import { NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import {
  type GoogleCalendarCallbackErrorCode,
} from "@/lib/google-calendar-callback-errors"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import { GOOGLE_CALENDAR_API } from "@/lib/google-calendar"
import { logServerError } from "@/lib/security/safe-server-log"

function calendarSettingsUrl(
  request: NextRequest,
  query: Record<string, string>
) {
  const u = new URL(
    "/portal-rrhh/configuracion/calendario",
    request.nextUrl.origin
  )
  for (const [k, v] of Object.entries(query)) {
    u.searchParams.set(k, v)
  }
  return u
}

function redirectWithError(
  request: NextRequest,
  code: GoogleCalendarCallbackErrorCode
) {
  return NextResponse.redirect(
    calendarSettingsUrl(request, { error: code })
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state") ?? ""
  const oauthError = searchParams.get("error")

  if (oauthError) {
    return redirectWithError(request, "connect_denied")
  }

  if (!code) {
    return redirectWithError(request, "missing_code")
  }

  const token = request.cookies.get(AUTH_COOKIES.access)?.value
  if (!token) {
    return redirectWithError(request, "session_expired")
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

    logServerError("google-calendar-callback", data)
    return redirectWithError(request, "callback_failed")
  } catch (error) {
    logServerError("google-calendar-callback", error)
    return redirectWithError(request, "callback_failed")
  }
}
