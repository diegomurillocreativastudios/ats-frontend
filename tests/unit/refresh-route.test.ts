import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const cookieGet = vi.fn()

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: cookieGet,
  }),
}))

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

import { POST as refreshPost } from "@/app/api/auth/refresh/route"
import { AUTH_COOKIES } from "@/lib/auth"

describe("POST /api/auth/refresh", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    cookieGet.mockReset()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("renueva cookies vía POST /auth/refresh", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === AUTH_COOKIES.refresh ? { value: "old-refresh" } : undefined
    )
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresIn: 3600,
      }),
    }) as unknown as typeof fetch

    const res = await refreshPost()
    expect(res.status).toBe(200)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "old-refresh" }),
      })
    )

    const setCookies = res.headers.getSetCookie?.() ?? []
    const joined = setCookies.join("\n")
    expect(joined).toContain("new-access")
    expect(joined).toContain("new-refresh")
  })

  it("limpia todas las cookies de sesión cuando el backend rechaza", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === AUTH_COOKIES.refresh ? { value: "dead-refresh" } : undefined
    )
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Sesión expirada." }),
    }) as unknown as typeof fetch

    const res = await refreshPost()
    expect(res.status).toBe(401)

    const joined = (res.headers.getSetCookie?.() ?? []).join("\n")
    expect(joined).toContain(`${AUTH_COOKIES.access}=`)
    expect(joined).toContain(`${AUTH_COOKIES.refresh}=`)
    expect(joined).toContain(`${AUTH_COOKIES.user}=`)
    expect(joined).toContain(`${AUTH_COOKIES.csrf}=`)
  })
})
