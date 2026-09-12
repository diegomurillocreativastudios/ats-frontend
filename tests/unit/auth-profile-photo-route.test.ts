import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

import { DELETE, GET, PUT } from "@/app/api/auth/profile/photo/route"

function mockBackendResponse(opts: {
  ok: boolean
  status: number
  body?: Record<string, unknown> | null
  retryAfter?: string | null
}) {
  return {
    ok: opts.ok,
    status: opts.status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "retry-after" ? (opts.retryAfter ?? null) : null,
    },
    json: async () => opts.body ?? {},
  }
}

function photoRequest(
  method: "GET" | "PUT" | "DELETE",
  token?: string,
  body?: BodyInit,
  contentType?: string
) {
  const headers = new Headers()
  if (token) headers.set("cookie", `ats_access_token=${token}`)
  if (contentType) headers.set("content-type", contentType)
  return new NextRequest("http://localhost/api/auth/profile/photo", {
    method,
    body,
    headers,
  })
}

describe("/api/auth/profile/photo", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("GET responde 401 sin access token", async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const res = await GET(photoRequest("GET"))
    expect(res.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("GET reenvía la foto y quita secretos", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: true,
        status: 200,
        body: {
          photoFileId: "p-1",
          contentType: "image/png",
          fileName: "avatar.png",
          sizeBytes: 12,
          base64: "YWJj",
          accessToken: "should-not-leak",
        },
      })
    ) as unknown as typeof fetch

    const res = await GET(photoRequest("GET", "session-token"))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    expect(body).toEqual({
      photoFileId: "p-1",
      contentType: "image/png",
      fileName: "avatar.png",
      sizeBytes: 12,
      base64: "YWJj",
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/auth/profile/photo",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer session-token",
        }),
      })
    )
  })

  it("GET reenvía 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 404,
        body: { message: "No hay foto de perfil." },
      })
    ) as unknown as typeof fetch

    const res = await GET(photoRequest("GET", "tok"))
    const body = (await res.json()) as Record<string, unknown>
    expect(res.status).toBe(404)
    expect(body.message).toBe("No hay foto de perfil.")
  })

  it("PUT reenvía el multipart con Bearer", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: true,
        status: 200,
        body: {
          photoFileId: "p-1",
          contentType: "image/png",
          base64: "YWJj",
        },
      })
    ) as unknown as typeof fetch

    const res = await PUT(
      photoRequest(
        "PUT",
        "session-token",
        new Uint8Array([1, 2, 3]),
        "multipart/form-data; boundary=abc"
      )
    )
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(body.photoFileId).toBe("p-1")
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/api/auth/profile/photo",
      expect.objectContaining({
        method: "PUT",
        headers: expect.any(Headers),
      })
    )
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [
      string,
      RequestInit,
    ]
    const headers = init.headers as Headers
    expect(headers.get("Authorization")).toBe("Bearer session-token")
    expect(headers.get("Content-Type")).toBe(
      "multipart/form-data; boundary=abc"
    )
  })

  it("PUT reenvía 429 y Retry-After", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 429,
        body: { message: "Demasiados intentos. Probá de nuevo más tarde." },
        retryAfter: "12",
      })
    ) as unknown as typeof fetch

    const res = await PUT(
      photoRequest(
        "PUT",
        "tok",
        new Uint8Array([1, 2, 3]),
        "multipart/form-data; boundary=abc"
      )
    )
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("12")
  })

  it("DELETE reenvía 204", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: true,
        status: 204,
        body: null,
      })
    ) as unknown as typeof fetch

    const res = await DELETE(photoRequest("DELETE", "tok"))
    expect(res.status).toBe(204)
    expect(res.headers.get("Cache-Control")).toBe("private, no-store")
  })
})
