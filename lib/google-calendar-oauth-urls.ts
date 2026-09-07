/**
 * Pantalla del ATS donde el usuario ve el resultado de conectar Google Calendar.
 * Debe coincidir con los redirects de `app/api/auth/google/callback/route.ts`.
 */
export const GOOGLE_CALENDAR_SETTINGS_PATH =
  "/portal-rrhh/configuracion/calendario"

const GOOGLE_OAUTH_HOST = "accounts.google.com"
const GOOGLE_OAUTH_PATH_PREFIX = "/o/oauth2/"

/**
 * Strict allowlist for Google Calendar OAuth authorize URLs before navigating.
 * Only https://accounts.google.com/o/oauth2/... is accepted.
 */
export function isAllowedGoogleOAuthAuthorizeUrl(
  value: string | null | undefined
): boolean {
  if (!value || typeof value !== "string") return false

  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    return false
  }

  if (parsed.protocol !== "https:") return false
  if (parsed.username || parsed.password) return false
  if (parsed.hostname.toLowerCase() !== GOOGLE_OAUTH_HOST) return false
  if (!parsed.pathname.startsWith(GOOGLE_OAUTH_PATH_PREFIX)) return false

  return true
}

/**
 * URLs que el backend suele pedir como `FrontendSuccessUrl` / `FrontendErrorUrl`
 * (appsettings o cuerpo de `authorize`).
 *
 * - Éxito: misma ruta con `?success=true` (lo lee `calendar-settings-client.tsx`).
 * - Error: base sin query; el backend o Google pueden añadir `?error=...`.
 *
 * Overrides opcionales (URLs absolutas, sin barra final en el origin):
 * - `NEXT_PUBLIC_GOOGLE_CALENDAR_SUCCESS_URL`
 * - `NEXT_PUBLIC_GOOGLE_CALENDAR_ERROR_URL`
 */
export function getGoogleCalendarFrontendOAuthUrls(): {
  frontendSuccessUrl: string
  frontendErrorUrl: string
} {
  const fromEnv = (
    successKey: string | undefined,
    errorKey: string | undefined
  ) => {
    const s = successKey?.trim()
    const e = errorKey?.trim()
    if (s && e) return { frontendSuccessUrl: s, frontendErrorUrl: e }
    if (s || e) {
      const origin = getPublicOrigin()
      const calUrl = `${origin}${GOOGLE_CALENDAR_SETTINGS_PATH}`
      return {
        frontendSuccessUrl: s || `${calUrl}?success=true`,
        frontendErrorUrl: e || calUrl,
      }
    }
    return null
  }

  const explicit = fromEnv(
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SUCCESS_URL,
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ERROR_URL
  )
  if (explicit) return explicit

  const origin = getPublicOrigin()
  const calUrl = `${origin}${GOOGLE_CALENDAR_SETTINGS_PATH}`
  return {
    frontendSuccessUrl: `${calUrl}?success=true`,
    frontendErrorUrl: calUrl,
  }
}

function getPublicOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "")
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  )
}
