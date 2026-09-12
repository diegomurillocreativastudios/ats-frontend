import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

import { PATCH } from "@/app/api/auth/profile/route"

function mockBackendResponse(opts: {
  ok: boolean
  status: number
  body: Record<string, unknown>
  retryAfter?: string | null
}) {
  return {
    ok: opts.ok,
    status: opts.status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "retry-after" ? (opts.retryAfter ?? null) : null,
    },
    json: async () => opts.body,
  }
}

function profileRequest(
  body: unknown,
  token?: string
) {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (token) headers.set("cookie", `ats_access_token=${token}`)
  return new NextRequest("http://localhost/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers,
  })
}

describe("PATCH /api/auth/profile", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("responde 401 sin access token y no llama al backend", async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const res = await PATCH(profileRequest({ userName: "Diego", name: "Diego" }))
    expect(res.status).toBe(401)
    expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("rechaza userName y name distintos sin llamar al backend", async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const res = await PATCH(
      profileRequest(
        { userName: "Diego", name: "Ana" },
        "tok"
      )
    )
    const body = (await res.json()) as Record<string, unknown>
    expect(res.status).toBe(400)
    expect(body.message).toBe("userName y name deben coincidir.")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("envía solo userName y name iguales con Bearer de la sesión", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: true,
        status: 200,
        body: {
          id: "u-1",
          name: "Diego Murillo",
          userName: "Diego Murillo",
          email: "diego@example.com",
          role: "Admin",
          roles: ["Admin"],
          accessToken: "should-not-leak",
        },
      })
    ) as unknown as typeof fetch

    const res = await PATCH(
      profileRequest(
        {
          userName: "  Diego Murillo  ",
          name: "  Diego Murillo  ",
          email: "ignore@example.com",
          role: "Admin",
        },
        "session-token"
      )
    )
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    expect(body).toEqual({
      id: "u-1",
      name: "Diego Murillo",
      userName: "Diego Murillo",
      email: "diego@example.com",
      role: "Admin",
      roles: ["Admin"],
    })
    expect(body).not.toHaveProperty("accessToken")
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/auth/profile",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          userName: "Diego Murillo",
          name: "Diego Murillo",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
          "Content-Type": "application/json",
        }),
      })
    )
  })

  it("reenvía 400 con message del backend", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 400,
        body: { message: "El nombre debe tener entre 2 y 80 caracteres." },
      })
    ) as unknown as typeof fetch

    const res = await PATCH(
      profileRequest({ userName: "Diego Murillo", name: "Diego Murillo" }, "tok")
    )
    const body = (await res.json()) as Record<string, unknown>
    expect(res.status).toBe(400)
    expect(body.message).toBe("El nombre debe tener entre 2 y 80 caracteres.")
  })

  it("reenvía 403", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 403,
        body: { message: "Forbidden" },
      })
    ) as unknown as typeof fetch

    const res = await PATCH(
      profileRequest({ userName: "Diego Murillo", name: "Diego Murillo" }, "tok")
    )
    expect(res.status).toBe(403)
  })

  it("reenvía 429 y Retry-After", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 429,
        body: { message: "Demasiados intentos. Probá de nuevo más tarde." },
        retryAfter: "12",
      })
    ) as unknown as typeof fetch

    const res = await PATCH(
      profileRequest({ userName: "Diego Murillo", name: "Diego Murillo" }, "tok")
    )
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("12")
  })
})
