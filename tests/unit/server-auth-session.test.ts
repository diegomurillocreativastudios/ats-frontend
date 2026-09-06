import { afterEach, describe, expect, it, vi } from "vitest"
import {
  parseBackendAuthPayload,
  extractBackendErrorCode,
  createAuthSessionResponse,
} from "@/lib/auth/server-auth-session"
import { AUTH_COOKIES } from "@/lib/auth"

vi.mock("@/lib/fetch-backend-session-user", () => ({
  fetchBackendSessionUser: vi.fn(async () => null),
}))

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

describe("createAuthSessionResponse cookie flags", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sets access and refresh HttpOnly and emits readable CSRF cookie", async () => {
    const response = await createAuthSessionResponse(
      "https://api.example.com",
      {
        accessToken: "access-secret",
        refreshToken: "refresh-secret",
        expiresIn: 3600,
      }
    )

    const access = response.cookies.get(AUTH_COOKIES.access)
    const refresh = response.cookies.get(AUTH_COOKIES.refresh)
    const csrf = response.cookies.get(AUTH_COOKIES.csrf)
    const expires = response.cookies.get(AUTH_COOKIES.expires)

    expect(access?.value).toBe("access-secret")
    expect(access?.httpOnly).toBe(true)
    expect(refresh?.httpOnly).toBe(true)
    expect(csrf?.httpOnly).toBe(false)
    expect(csrf?.value?.length).toBeGreaterThan(16)
    expect(expires?.httpOnly).toBe(false)

    const body = await response.json()
    expect(body).toEqual({ success: true })
    expect(body).not.toHaveProperty("accessToken")
    expect(body).not.toHaveProperty("token")
  })
})
