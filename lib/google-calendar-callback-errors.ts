/**
 * Stable OAuth callback error codes safe to put in the redirect query.
 * FE-SEC-022: never put exception messages or backend detail in the URL.
 */
export const GOOGLE_CALENDAR_CALLBACK_ERROR_CODES = [
  "missing_code",
  "session_expired",
  "connect_denied",
  "callback_failed",
] as const

export type GoogleCalendarCallbackErrorCode =
  (typeof GOOGLE_CALENDAR_CALLBACK_ERROR_CODES)[number]

const CODE_SET = new Set<string>(GOOGLE_CALENDAR_CALLBACK_ERROR_CODES)

/**
 * Returns a known callback error code, or null when the query value is unknown.
 */
export function parseGoogleCalendarCallbackError(
  value: string | null | undefined
): GoogleCalendarCallbackErrorCode | null {
  if (!value) return null
  const decoded = (() => {
    try {
      return decodeURIComponent(value.trim())
    } catch {
      return value.trim()
    }
  })()
  if (!decoded) return null
  if (CODE_SET.has(decoded)) {
    return decoded as GoogleCalendarCallbackErrorCode
  }
  return null
}

/** i18n key under RecruiterPortal.settings.calendarPage for a known code. */
export function googleCalendarCallbackErrorI18nKey(
  code: GoogleCalendarCallbackErrorCode
): `oauthErrors.${GoogleCalendarCallbackErrorCode}` {
  return `oauthErrors.${code}`
}
