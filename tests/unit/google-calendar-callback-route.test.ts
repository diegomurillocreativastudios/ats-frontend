import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const cookieGet = vi.fn()

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}))

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

vi.mock("@/lib/security/safe-server-log", () => ({
  logServerError: vi.fn(() => "abcd1234"),
}))

import { GET } from "@/app/api/auth/google/callback/route"
import { AUTH_COOKIES } from "@/lib/auth"

function callbackRequest(query: string) {
  return new NextRequest(
    `http://localhost/api/auth/google/callback?${query}`
  )
}

describe("FE-SEC-022 GET /api/auth/google/callback", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    cookieGet.mockReset()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("redirects OAuth deny with stable connect_denied code", async () => {
    const res = await GET(
      callbackRequest("error=access_denied&error_description=User%20denied")
    )
    expect(res.status).toBe(307)
    const location = res.headers.get("location") ?? ""
    expect(location).toContain("error=connect_denied")
    expect(location).not.toContain("User")
    expect(location).not.toContain("access_denied")
  })

  it("redirects missing code with missing_code", async () => {
    const res = await GET(callbackRequest(""))
    expect(res.headers.get("location") ?? "").toContain("error=missing_code")
  })

  it("redirects without session with session_expired", async () => {
    cookieGet.mockReturnValue(undefined)
    const req = callbackRequest("code=abc&state=xyz")
    // Route reads cookies from request.cookies, not next/headers
    Object.defineProperty(req, "cookies", {
      value: { get: () => undefined },
    })
    const res = await GET(req)
    expect(res.headers.get("location") ?? "").toContain("error=session_expired")
  })

  it("never puts backend exception text in the redirect query", async () => {
    const req = callbackRequest("code=abc&state=xyz")
    Object.defineProperty(req, "cookies", {
      value: {
        get: (name: string) =>
          name === AUTH_COOKIES.access ? { value: "tok" } : undefined,
      },
    })
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        message: "SqlException: connection string leaked",
        stack: "at Foo.Bar()",
      }),
    }) as unknown as typeof fetch

    const res = await GET(req)
    const location = res.headers.get("location") ?? ""
    expect(location).toContain("error=callback_failed")
    expect(location).not.toMatch(/SqlException|connection string|stack/i)
  })
})
