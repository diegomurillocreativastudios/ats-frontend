import { afterEach, describe, expect, it } from "vitest"
import {
  SSO_EXCHANGE_CODE_STORAGE_KEY,
  clearPersistedSsoExchangeCode,
  persistSsoExchangeCode,
  readPersistedSsoExchangeCode,
  readSsoExchangeCodeFromHash,
  resolveSsoExchangeCode,
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

describe("resolveSsoExchangeCode", () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it("persists a hash code and returns it", () => {
    expect(resolveSsoExchangeCode("#code=abc123")).toBe("abc123")
    expect(readPersistedSsoExchangeCode()).toBe("abc123")
    expect(sessionStorage.getItem(SSO_EXCHANGE_CODE_STORAGE_KEY)).toBe("abc123")
  })

  it("recovers a persisted code when the hash is empty", () => {
    persistSsoExchangeCode("from-storage")
    expect(resolveSsoExchangeCode("")).toBe("from-storage")
    expect(resolveSsoExchangeCode("#")).toBe("from-storage")
  })

  it("prefers the hash over a stale persisted code", () => {
    persistSsoExchangeCode("stale")
    expect(resolveSsoExchangeCode("#code=fresh")).toBe("fresh")
    expect(readPersistedSsoExchangeCode()).toBe("fresh")
  })

  it("clears the persisted code", () => {
    persistSsoExchangeCode("abc123")
    clearPersistedSsoExchangeCode()
    expect(readPersistedSsoExchangeCode()).toBe("")
    expect(resolveSsoExchangeCode("")).toBe("")
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
