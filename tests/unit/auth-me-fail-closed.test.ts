import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const cookiesMock = vi.fn()
const getServerBackendBaseUrlMock = vi.fn()
const fetchBackendSessionUserMock = vi.fn()

vi.mock("next/headers", () => ({
  cookies: (...args: unknown[]) => cookiesMock(...args),
}))

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => getServerBackendBaseUrlMock(),
}))

vi.mock("@/lib/fetch-backend-session-user", () => ({
  fetchBackendSessionUser: (...args: unknown[]) =>
    fetchBackendSessionUserMock(...args),
}))

describe("GET /api/auth/me fail-closed", () => {
  beforeEach(() => {
    cookiesMock.mockReset()
    getServerBackendBaseUrlMock.mockReset()
    fetchBackendSessionUserMock.mockReset()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it("returns 401 without access token", async () => {
    cookiesMock.mockResolvedValue({
      get: () => undefined,
    })
    const { GET } = await import("@/app/api/auth/me/route")
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns 503 when backend base URL is missing", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) =>
        name === "ats_access_token" ? { value: "tok" } : undefined,
    })
    getServerBackendBaseUrlMock.mockReturnValue("")
    const { GET } = await import("@/app/api/auth/me/route")
    const res = await GET()
    expect(res.status).toBe(503)
  })

  it("returns 401 when backend rejects the token", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) =>
        name === "ats_access_token" ? { value: "tok" } : undefined,
    })
    getServerBackendBaseUrlMock.mockReturnValue("https://api.example.com")
    fetchBackendSessionUserMock.mockResolvedValue({
      status: "unauthenticated",
    })
    const { GET } = await import("@/app/api/auth/me/route")
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns 503 when backend is unavailable", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) =>
        name === "ats_access_token" ? { value: "tok" } : undefined,
    })
    getServerBackendBaseUrlMock.mockReturnValue("https://api.example.com")
    fetchBackendSessionUserMock.mockResolvedValue({ status: "unavailable" })
    const { GET } = await import("@/app/api/auth/me/route")
    const res = await GET()
    expect(res.status).toBe(503)
  })

  it("returns user from backend and ignores ats_user cookie", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "ats_access_token") return { value: "tok" }
        if (name === "ats_user") {
          return {
            value: JSON.stringify({
              id: "spoof",
              name: "Spoof",
              email: "spoof@evil",
              role: "admin",
            }),
          }
        }
        return undefined
      },
    })
    getServerBackendBaseUrlMock.mockReturnValue("https://api.example.com")
    fetchBackendSessionUserMock.mockResolvedValue({
      status: "ok",
      user: {
        id: "real-1",
        name: "Real",
        email: "real@example.com",
        role: "candidate",
      },
    })
    const { GET } = await import("@/app/api/auth/me/route")
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      id: "real-1",
      name: "Real",
      email: "real@example.com",
      role: "candidate",
    })
    expect(body.role).not.toBe("admin")
  })

  it("does not echo ats_user when backend is down", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "ats_access_token") return { value: "tok" }
        if (name === "ats_user") {
          return {
            value: JSON.stringify({ role: "admin", email: "x@y.com" }),
          }
        }
        return undefined
      },
    })
    getServerBackendBaseUrlMock.mockReturnValue("https://api.example.com")
    fetchBackendSessionUserMock.mockResolvedValue({ status: "unavailable" })
    const { GET } = await import("@/app/api/auth/me/route")
    const res = await GET()
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body).not.toHaveProperty("role")
  })
})
