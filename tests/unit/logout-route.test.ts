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

import { POST as logoutPost } from "@/app/api/auth/logout/route"
import { AUTH_COOKIES } from "@/lib/auth"

describe("POST /api/auth/logout", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    cookieGet.mockReset()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("llama al backend con refreshToken y siempre borra cookies", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === AUTH_COOKIES.refresh ? { value: "refresh-secret" } : undefined
    )
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }) as unknown as typeof fetch

    const res = await logoutPost()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/auth/logout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "refresh-secret" }),
      })
    )

    const setCookies = res.headers.getSetCookie?.() ?? []
    const joined = setCookies.join("\n")
    expect(joined).toContain(`${AUTH_COOKIES.access}=`)
    expect(joined).toContain(`${AUTH_COOKIES.refresh}=`)
    expect(joined).toContain(`${AUTH_COOKIES.expires}=`)
    expect(joined).toContain(`${AUTH_COOKIES.user}=`)
    expect(joined).toContain(`${AUTH_COOKIES.csrf}=`)
  })

  it("borra cookies aunque el backend falle", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === AUTH_COOKIES.refresh ? { value: "refresh-secret" } : undefined
    )
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch

    const res = await logoutPost()
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)

    const setCookies = res.headers.getSetCookie?.() ?? []
    expect(setCookies.join("\n")).toContain(`${AUTH_COOKIES.refresh}=`)
  })

  it("sin refresh token no llama al backend y limpia cookies", async () => {
    cookieGet.mockReturnValue(undefined)
    globalThis.fetch = vi.fn() as unknown as typeof fetch

    const res = await logoutPost()
    expect(res.status).toBe(200)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
