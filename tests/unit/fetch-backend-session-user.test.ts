import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchBackendSessionUser } from "@/lib/fetch-backend-session-user"

describe("fetchBackendSessionUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns ok with user payload on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: "u-1",
            email: "a@b.com",
            name: "Ana",
            role: "admin",
          }),
          { status: 200 }
        )
      )
    )

    const result = await fetchBackendSessionUser(
      "https://api.example.com",
      "token"
    )
    expect(result).toEqual({
      status: "ok",
      user: {
        id: "u-1",
        email: "a@b.com",
        name: "Ana",
        role: "admin",
      },
    })
  })

  it("returns unauthenticated on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 401 }))
    )
    const result = await fetchBackendSessionUser(
      "https://api.example.com",
      "token"
    )
    expect(result).toEqual({ status: "unauthenticated" })
  })

  it("returns unauthenticated on 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 403 }))
    )
    const result = await fetchBackendSessionUser(
      "https://api.example.com",
      "token"
    )
    expect(result).toEqual({ status: "unauthenticated" })
  })

  it("returns unavailable on 5xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 503 }))
    )
    const result = await fetchBackendSessionUser(
      "https://api.example.com",
      "token"
    )
    expect(result).toEqual({ status: "unavailable" })
  })

  it("returns unavailable on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED")
      })
    )
    const result = await fetchBackendSessionUser(
      "https://api.example.com",
      "token"
    )
    expect(result).toEqual({ status: "unavailable" })
  })

  it("returns unavailable when base URL is empty", async () => {
    const result = await fetchBackendSessionUser("", "token")
    expect(result).toEqual({ status: "unavailable" })
  })
})
