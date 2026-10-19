import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const cookiesMock = vi.fn()
const getServerBackendBaseUrlMock = vi.fn()
const fetchBackendSessionUserMock = vi.fn()
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock("next/headers", () => ({
  cookies: (...args: unknown[]) => cookiesMock(...args),
}))

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}))

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => getServerBackendBaseUrlMock(),
}))

vi.mock("@/lib/fetch-backend-session-user", () => ({
  fetchBackendSessionUser: (...args: unknown[]) =>
    fetchBackendSessionUserMock(...args),
}))

function mockOkSession(role: string) {
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
      role,
    },
  })
}

describe("getServerSessionUser fail-closed", () => {
  beforeEach(() => {
    cookiesMock.mockReset()
    getServerBackendBaseUrlMock.mockReset()
    fetchBackendSessionUserMock.mockReset()
    redirectMock.mockClear()
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
    mockOkSession("recruiter")
    const { getServerSessionUser } = await import("@/lib/server-session-user")
    expect(await getServerSessionUser()).toEqual({
      id: "u-1",
      name: "Ada",
      email: "ada@example.com",
      role: "recruiter",
    })
  })
})

describe("requirePortalCandidateUser", () => {
  beforeEach(() => {
    cookiesMock.mockReset()
    getServerBackendBaseUrlMock.mockReset()
    fetchBackendSessionUserMock.mockReset()
    redirectMock.mockClear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it("permite solo rol de candidato", async () => {
    mockOkSession("Candidate")
    const { requirePortalCandidateUser } = await import(
      "@/lib/server-session-user"
    )
    await expect(requirePortalCandidateUser()).resolves.toMatchObject({
      role: "Candidate",
    })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it("redirige admin y reclutador a selección de portal", async () => {
    for (const role of ["admin", "recruiter"] as const) {
      vi.resetModules()
      redirectMock.mockClear()
      mockOkSession(role)
      const { requirePortalCandidateUser } = await import(
        "@/lib/server-session-user"
      )
      await expect(requirePortalCandidateUser()).rejects.toThrow(
        "REDIRECT:/seleccion-portal",
      )
      expect(redirectMock).toHaveBeenCalledWith("/seleccion-portal")
    }
  })
})
