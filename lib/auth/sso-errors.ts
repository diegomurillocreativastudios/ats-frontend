const OAUTH_ERROR_ALIASES: Record<string, string> = {
  access_denied: "linkedin_sso_failed",
  user_cancelled_login: "linkedin_sso_failed",
}

const KNOWN_SSO_ERROR_CODES = new Set([
  "account_banned",
  "account_exists",
  "email_not_verified",
  "exchange_code_expired",
  "exchange_code_used",
  "invalid_state",
  "linkedin_sso_failed",
  "missing_code",
  "network_error",
])

/**
 * Resuelve el código de error SSO desde query params.
 * El FE histórico usa `error`; el backend security-hardening puede enviar `reason`.
 */
export function resolveSsoQueryErrorCode(
  error: string | null | undefined,
  reason: string | null | undefined
): string | null {
  const fromError = typeof error === "string" ? error.trim() : ""
  if (fromError) return fromError
  const fromReason = typeof reason === "string" ? reason.trim() : ""
  if (fromReason) return fromReason
  return null
}

/** Map backend/query error codes to Auth.sso.errors.* translation keys. */
export function getSsoErrorTranslationKey(
  code: string | null | undefined
): "errorDescription" | `errors.${string}` {
  if (!code) return "errorDescription"
  const normalized = code.trim().toLowerCase()
  const mapped = OAUTH_ERROR_ALIASES[normalized] ?? normalized
  if (KNOWN_SSO_ERROR_CODES.has(mapped)) {
    return `errors.${mapped}` as `errors.${string}`
  }
  return "errorDescription"
}
