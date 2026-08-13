const OAUTH_ERROR_ALIASES: Record<string, string> = {
  access_denied: "linkedin_sso_failed",
  user_cancelled_login: "linkedin_sso_failed",
}

const KNOWN_SSO_ERROR_CODES = new Set([
  "account_banned",
  "account_exists",
  "account_link_failed",
  "email_not_verified",
  "email_required",
  "exchange_code_expired",
  "exchange_code_used",
  "id_token_invalid",
  "invalid_state",
  "linkedin_sso_failed",
  "missing_code",
  "missing_code_or_state",
  "network_error",
  "not_configured",
  "token_exchange_failed",
  "user_creation_failed",
  "userinfo_failed",
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

/** Normalize backend/query codes (aliases) before translation lookup. */
export function normalizeSsoErrorCode(
  code: string | null | undefined
): string | null {
  if (!code) return null
  const normalized = code.trim().toLowerCase()
  if (!normalized) return null
  return OAUTH_ERROR_ALIASES[normalized] ?? normalized
}

/** True when the code maps to a dedicated Auth.sso.errors.* message. */
export function isKnownSsoErrorCode(code: string | null | undefined): boolean {
  const mapped = normalizeSsoErrorCode(code)
  return mapped != null && KNOWN_SSO_ERROR_CODES.has(mapped)
}

/** Map backend/query error codes to Auth.sso.errors.* translation keys. */
export function getSsoErrorTranslationKey(
  code: string | null | undefined
): "errorDescription" | `errors.${string}` {
  const mapped = normalizeSsoErrorCode(code)
  if (!mapped) return "errorDescription"
  if (KNOWN_SSO_ERROR_CODES.has(mapped)) {
    return `errors.${mapped}` as `errors.${string}`
  }
  return "errorDescription"
}
