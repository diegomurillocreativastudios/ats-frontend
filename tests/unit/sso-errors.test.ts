import { describe, it, expect } from "vitest"
import {
  getSsoErrorTranslationKey,
  isKnownSsoErrorCode,
  normalizeSsoErrorCode,
  resolveSsoQueryErrorCode,
} from "@/lib/auth/sso-errors"

describe("resolveSsoQueryErrorCode", () => {
  it("prefers error over reason", () => {
    expect(resolveSsoQueryErrorCode("account_exists", "invalid_state")).toBe(
      "account_exists"
    )
  })

  it("falls back to reason when error is missing", () => {
    expect(resolveSsoQueryErrorCode(null, "account_exists")).toBe(
      "account_exists"
    )
    expect(resolveSsoQueryErrorCode("  ", "account_banned")).toBe(
      "account_banned"
    )
  })

  it("returns null when both are empty", () => {
    expect(resolveSsoQueryErrorCode(null, null)).toBeNull()
    expect(resolveSsoQueryErrorCode("", "")).toBeNull()
  })
})

describe("getSsoErrorTranslationKey", () => {
  it("maps account_exists and invalid_state to dedicated keys", () => {
    expect(getSsoErrorTranslationKey("account_exists")).toBe(
      "errors.account_exists"
    )
    expect(getSsoErrorTranslationKey("invalid_state")).toBe(
      "errors.invalid_state"
    )
    expect(getSsoErrorTranslationKey("network_error")).toBe(
      "errors.network_error"
    )
  })

  it("maps backend reason codes added in BE-SEC-013", () => {
    expect(getSsoErrorTranslationKey("id_token_invalid")).toBe(
      "errors.id_token_invalid"
    )
    expect(getSsoErrorTranslationKey("not_configured")).toBe(
      "errors.not_configured"
    )
    expect(getSsoErrorTranslationKey("token_exchange_failed")).toBe(
      "errors.token_exchange_failed"
    )
    expect(getSsoErrorTranslationKey("userinfo_failed")).toBe(
      "errors.userinfo_failed"
    )
    expect(getSsoErrorTranslationKey("email_required")).toBe(
      "errors.email_required"
    )
    expect(getSsoErrorTranslationKey("account_link_failed")).toBe(
      "errors.account_link_failed"
    )
    expect(getSsoErrorTranslationKey("user_creation_failed")).toBe(
      "errors.user_creation_failed"
    )
    expect(getSsoErrorTranslationKey("missing_code_or_state")).toBe(
      "errors.missing_code_or_state"
    )
  })

  it("aliases oauth cancel codes to linkedin_sso_failed", () => {
    expect(getSsoErrorTranslationKey("access_denied")).toBe(
      "errors.linkedin_sso_failed"
    )
  })

  it("falls back to generic description for unknown codes", () => {
    expect(getSsoErrorTranslationKey("weird_code")).toBe("errorDescription")
  })
})

describe("isKnownSsoErrorCode", () => {
  it("returns true for known and aliased codes", () => {
    expect(isKnownSsoErrorCode("account_exists")).toBe(true)
    expect(isKnownSsoErrorCode("access_denied")).toBe(true)
    expect(isKnownSsoErrorCode("id_token_invalid")).toBe(true)
  })

  it("returns false for unknown codes", () => {
    expect(isKnownSsoErrorCode("weird_code")).toBe(false)
    expect(isKnownSsoErrorCode(null)).toBe(false)
  })
})

describe("normalizeSsoErrorCode", () => {
  it("applies oauth aliases", () => {
    expect(normalizeSsoErrorCode("user_cancelled_login")).toBe(
      "linkedin_sso_failed"
    )
  })
})
