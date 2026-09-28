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

describe("getServerSessionUser fail-closed", () => {
  beforeEach(() => {
    cookiesMock.mockReset()
    getServerBackendBaseUrlMock.mockReset()
    fetchBackendSessionUserMock.mockReset()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it("returns null without access token even if ats_user claims admin", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "ats_user") {
          return {
            value: JSON.stringify({
              id: "1",
              role: "admin",
              email: "a@b.com",
            }),
          }
        }
        return undefined
      },
    })
    const { getServerSessionUser } = await import("@/lib/server-session-user")
    expect(await getServerSessionUser()).toBeNull()
  })

  it("returns null when backend is unavailable (ignores ats_user)", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) => {
        if (name === "ats_access_token") return { value: "tok" }
        if (name === "ats_user") {
          return {
            value: JSON.stringify({ role: "admin", email: "a@b.com" }),
          }
        }
        return undefined
      },
    })
    getServerBackendBaseUrlMock.mockReturnValue("https://api.example.com")
    fetchBackendSessionUserMock.mockResolvedValue({ status: "unavailable" })
    const { getServerSessionUser } = await import("@/lib/server-session-user")
    expect(await getServerSessionUser()).toBeNull()
  })

  it("returns backend user when session is ok", async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) =>
        name === "ats_access_token" ? { value: "tok" } : undefined,
    })
    getServerBackendBaseUrlMock.mockReturnValue("https://api.example.com")
    fetchBackendSessionUserMock.mockResolvedValue({
      status: "ok",
      user: {
        id: "u-1",
        name: "Ada",
        email: "ada@example.com",
        role: "recruiter",
      },
    })
    const { getServerSessionUser } = await import("@/lib/server-session-user")
    expect(await getServerSessionUser()).toEqual({
      id: "u-1",
      name: "Ada",
      email: "ada@example.com",
      role: "recruiter",
    })
  })
})
