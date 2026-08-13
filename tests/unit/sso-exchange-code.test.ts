import { describe, it, expect } from "vitest"
import {
  readSsoExchangeCodeFromHash,
  stripSsoCodeFromLocationUrl,
} from "@/lib/auth/sso-exchange-code"

describe("readSsoExchangeCodeFromHash", () => {
  it("reads code from #code= fragment", () => {
    expect(readSsoExchangeCodeFromHash("#code=abc123")).toBe("abc123")
  })

  it("reads code when hash has extra params", () => {
    expect(readSsoExchangeCodeFromHash("#code=xyz&other=1")).toBe("xyz")
  })

  it("accepts hash without leading #", () => {
    expect(readSsoExchangeCodeFromHash("code=plain")).toBe("plain")
  })

  it("returns empty for missing or empty hash", () => {
    expect(readSsoExchangeCodeFromHash(null)).toBe("")
    expect(readSsoExchangeCodeFromHash(undefined)).toBe("")
    expect(readSsoExchangeCodeFromHash("")).toBe("")
    expect(readSsoExchangeCodeFromHash("#")).toBe("")
  })

  it("returns empty when code key is absent", () => {
    expect(readSsoExchangeCodeFromHash("#returnUrl=/portal")).toBe("")
  })

  it("trims whitespace around the code value", () => {
    expect(readSsoExchangeCodeFromHash("#code=%20token%20")).toBe("token")
  })
})

describe("stripSsoCodeFromLocationUrl", () => {
  it("removes hash and query code while keeping returnUrl", () => {
    expect(
      stripSsoCodeFromLocationUrl(
        "https://app.example/auth/sso/success?returnUrl=%2Fportal&code=leak#code=secret",
        "/auth/sso/success",
        "?returnUrl=%2Fportal&code=leak"
      )
    ).toBe("https://app.example/auth/sso/success?returnUrl=%2Fportal")
  })

  it("returns pathname only when search is empty", () => {
    expect(
      stripSsoCodeFromLocationUrl(
        "https://app.example/auth/sso/success#code=x",
        "/auth/sso/success",
        ""
      )
    ).toBe("https://app.example/auth/sso/success")
  })
})
