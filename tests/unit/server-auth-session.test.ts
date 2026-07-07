import { describe, expect, it } from "vitest"
import {
  parseBackendAuthPayload,
  extractBackendErrorCode,
} from "@/lib/auth/server-auth-session"

describe("parseBackendAuthPayload", () => {
  it("parses access token and internal returnUrl", () => {
    const parsed = parseBackendAuthPayload({
      accessToken: "token-1",
      refreshToken: "refresh-1",
      expiresIn: 7200,
      returnUrl: "/portal-rrhh",
    })

    expect(parsed).toEqual({
      accessToken: "token-1",
      refreshToken: "refresh-1",
      expiresIn: 7200,
      returnUrl: "/portal-rrhh",
      userFromBackend: null,
    })
  })

  it("rejects external returnUrl values", () => {
    const parsed = parseBackendAuthPayload({
      accessToken: "token-1",
      returnUrl: "https://evil.com",
    })

    expect(parsed?.returnUrl).toBeNull()
  })
})

describe("extractBackendErrorCode", () => {
  it("reads code from backend payload", () => {
    expect(extractBackendErrorCode({ code: "exchange_code_expired" })).toBe(
      "exchange_code_expired"
    )
  })
})
