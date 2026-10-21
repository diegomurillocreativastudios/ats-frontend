import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const cookieGet = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => cookieGet(name),
  })),
}))

import { POST } from "@/app/api/auth/upload-grant/route"

describe("POST /api/auth/upload-grant", () => {
  const originalPublic = process.env.NEXT_PUBLIC_API_URL
  const originalVercel = process.env.VERCEL
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    cookieGet.mockReset()
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/"
    delete process.env.VERCEL
  })

  it("does not return a token when the host is not Vercel", async () => {
    cookieGet.mockImplementation((name: string) =>
      name === "ats_access_token" ? { value: "session-token" } : undefined
    )

    const response = await POST()
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(body).toEqual({ direct: false })
    expect(body.accessToken).toBeUndefined()
    expect(body.apiBaseUrl).toBeUndefined()
  })

  it("returns the public API origin and the session token on Vercel", async () => {
    process.env.VERCEL = "1"
    cookieGet.mockImplementation((name: string) =>
      name === "ats_access_token" ? { value: "session-token" } : undefined
    )

    const response = await POST()
    const body = (await response.json()) as {
      direct: boolean
      apiBaseUrl: string
      accessToken: string | null
    }

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(body).toEqual({
      direct: true,
      apiBaseUrl: "https://api.example.com",
      accessToken: "session-token",
    })
  })

  it("returns a null token on Vercel when the browser has no session", async () => {
    process.env.VERCEL = "1"
    cookieGet.mockReturnValue(undefined)

    const response = await POST()
    const body = (await response.json()) as {
      direct: boolean
      accessToken: string | null
    }

    expect(response.status).toBe(200)
    expect(body.direct).toBe(true)
    expect(body.accessToken).toBeNull()
  })

  it("does not return a token when the API URL is missing on Vercel", async () => {
    process.env.VERCEL = "1"
    delete process.env.NEXT_PUBLIC_API_URL
    cookieGet.mockReturnValue({ value: "session-token" })

    const response = await POST()
    const body = (await response.json()) as { accessToken?: string; message?: string }

    expect(response.status).toBe(500)
    expect(body.accessToken).toBeUndefined()
    expect(body.message).toMatch(/URL pública del API/)
  })

  it("rejects a non-origin API URL on Vercel without returning the token", async () => {
    process.env.VERCEL = "1"
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/internal"
    cookieGet.mockReturnValue({ value: "session-token" })

    const response = await POST()
    const body = (await response.json()) as { accessToken?: string }

    expect(response.status).toBe(500)
    expect(body.accessToken).toBeUndefined()
  })

  afterEach(() => {
    restoreEnv("NEXT_PUBLIC_API_URL", originalPublic)
    restoreEnv("VERCEL", originalVercel)
    restoreEnv("NODE_ENV", originalNodeEnv)
  })
})

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
