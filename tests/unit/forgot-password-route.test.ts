import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

import { POST } from "@/app/api/auth/forgot-password/route"

describe("POST /api/auth/forgot-password", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("responde mensaje uniforme sin exists ni success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        message:
          "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.",
        exists: true,
        success: true,
      }),
    }) as unknown as typeof fetch

    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "alguien@ejemplo.com" }),
      headers: { "Content-Type": "application/json" },
    })

    const res = await POST(req)
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(body.message).toMatch(/Si existe una cuenta/i)
    expect(body).not.toHaveProperty("exists")
    expect(body).not.toHaveProperty("success")
  })

  it("reenvía Retry-After en 429", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "retry-after" ? "30" : null,
      },
      json: async () => ({ detail: "Demasiados intentos" }),
    }) as unknown as typeof fetch

    const req = new NextRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "alguien@ejemplo.com" }),
      headers: { "Content-Type": "application/json" },
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("30")
  })
})
