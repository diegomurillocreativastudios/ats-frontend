import { beforeEach, describe, expect, it, vi } from "vitest"

const loadRecruiterPhotoIfNeededMock = vi.hoisted(() => vi.fn())
const writeRecruiterPhotoCacheMock = vi.hoisted(() => vi.fn())
const clearRecruiterPhotoCacheMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/rrhh/recruiter-photo-cache", () => ({
  loadRecruiterPhotoIfNeeded: (...args: unknown[]) =>
    loadRecruiterPhotoIfNeededMock(...args),
  writeRecruiterPhotoCache: (...args: unknown[]) =>
    writeRecruiterPhotoCacheMock(...args),
  clearRecruiterPhotoCache: (...args: unknown[]) =>
    clearRecruiterPhotoCacheMock(...args),
}))

import {
  clearCurrentUserStore,
  getCurrentUserState,
  loadCurrentUser,
  resetCurrentUserStoreForTests,
} from "@/lib/rrhh/current-user-store"

describe("current-user-store", () => {
  beforeEach(() => {
    resetCurrentUserStoreForTests()
    loadRecruiterPhotoIfNeededMock.mockReset()
    writeRecruiterPhotoCacheMock.mockReset()
    clearRecruiterPhotoCacheMock.mockReset()
    loadRecruiterPhotoIfNeededMock.mockResolvedValue(undefined)
    vi.stubGlobal("fetch", vi.fn())
  })

  it("dedupes concurrent GET /api/auth/me calls", async () => {
    let resolveFetch: (value: Response) => void = () => undefined
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )

    const first = loadCurrentUser()
    const second = loadCurrentUser()
    expect(fetch).toHaveBeenCalledTimes(1)

    resolveFetch(
      new Response(
        JSON.stringify({
          id: "u-1",
          name: "Diego",
          email: "diego@example.com",
          role: "recruiter",
          hasPhoto: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
    await Promise.all([first, second])

    expect(getCurrentUserState().user?.id).toBe("u-1")
    expect(loadRecruiterPhotoIfNeededMock).toHaveBeenCalledWith("u-1")
  })

  it("skips a second load when the store is already ready", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "u-1",
          name: "Diego",
          email: "diego@example.com",
          role: "recruiter",
          hasPhoto: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )

    await loadCurrentUser()
    await loadCurrentUser()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(writeRecruiterPhotoCacheMock).toHaveBeenCalledWith("u-1", null)
  })

  it("force reload refetches session without clearing a ready user first", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "u-1",
            name: "Diego",
            email: "diego@example.com",
            role: "recruiter",
            hasPhoto: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "u-1",
            name: "Diego M",
            email: "diego@example.com",
            role: "recruiter",
            hasPhoto: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )

    await loadCurrentUser()
    expect(getCurrentUserState().status).toBe("ready")

    const pending = loadCurrentUser({ force: true })
    expect(getCurrentUserState().status).toBe("ready")
    await pending
    expect(getCurrentUserState().user?.name).toBe("Diego M")
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("clears photo cache when the session is unauthorized", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    )

    await loadCurrentUser()
    expect(getCurrentUserState().user).toBeNull()
    expect(clearRecruiterPhotoCacheMock).toHaveBeenCalled()
  })

  it("clearCurrentUserStore resets to idle", () => {
    clearCurrentUserStore()
    expect(getCurrentUserState()).toEqual({
      user: null,
      status: "idle",
    })
  })
})
