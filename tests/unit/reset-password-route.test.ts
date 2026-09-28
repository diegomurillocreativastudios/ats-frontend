import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

import { POST } from "@/app/api/auth/reset-password/route"

function resetRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/auth/reset-password", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("rechaza sin token y no llama al backend", async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const res = await POST(
      resetRequest({ password: "NuevaClave123" }),
    )
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(400)
    expect(body.message).toMatch(/token/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("rechaza body solo-email (sin token) y no llama al backend", async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const res = await POST(
      resetRequest({
        password: "NuevaClave123",
        email: "alguien@ejemplo.com",
      }),
    )
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(400)
    expect(body.message).toMatch(/token/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("con token válido reenvía solo password y token (sin email)", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ ok: true }),
    })
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const res = await POST(
      resetRequest({
        password: "NuevaClave123",
        token: "demo-token",
        email: "alguien@ejemplo.com",
      }),
    )

    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      password: "NuevaClave123",
      token: "demo-token",
    })
  })
})
