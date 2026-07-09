const OAUTH_ERROR_ALIASES: Record<string, string> = {
  access_denied: "linkedin_sso_failed",
  user_cancelled_login: "linkedin_sso_failed",
}

const KNOWN_SSO_ERROR_CODES = new Set([
  "account_banned",
  "email_not_verified",
  "exchange_code_expired",
  "exchange_code_used",
  "linkedin_sso_failed",
  "missing_code",
])

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
