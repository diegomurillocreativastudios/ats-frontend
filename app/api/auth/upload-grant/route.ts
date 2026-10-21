import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { resolvePublicApiOrigin } from "@/lib/public-api-origin"
import { applyPrivateNoStore } from "@/lib/security/cache-headers"

const MISSING_PUBLIC_API_URL_MESSAGE =
  "No se puede enviar este archivo porque la URL pública del API no está configurada."

/**
 * Tells the browser whether a large multipart body can skip the BFF.
 * Vercel Functions reject bodies over 4.5 MB, so only that host gets a direct
 * API origin and the session access token. Other hosts keep the token HttpOnly
 * and upload through the BFF.
 */
export async function POST() {
  if (process.env.VERCEL !== "1") {
    return applyPrivateNoStore(NextResponse.json({ direct: false }))
  }

  const apiBaseUrl = resolvePublicApiOrigin()
  if (!apiBaseUrl) {
    return applyPrivateNoStore(
      NextResponse.json(
        { message: MISSING_PUBLIC_API_URL_MESSAGE },
        { status: 500 }
      )
    )
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value?.trim() || null

  return applyPrivateNoStore(
    NextResponse.json({
      direct: true,
      apiBaseUrl,
      accessToken,
    })
  )
}
