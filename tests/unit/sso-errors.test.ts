import { describe, it, expect } from "vitest"
import {
  getSsoErrorTranslationKey,
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

  it("aliases oauth cancel codes to linkedin_sso_failed", () => {
    expect(getSsoErrorTranslationKey("access_denied")).toBe(
      "errors.linkedin_sso_failed"
    )
  })

  it("falls back to generic description for unknown codes", () => {
    expect(getSsoErrorTranslationKey("weird_code")).toBe("errorDescription")
  })
})
