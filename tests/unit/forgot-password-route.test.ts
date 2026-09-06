import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

import { POST } from "@/app/api/auth/forgot-password/route"

const GENERIC_MESSAGE =
  "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña."

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

function forgotRequest(email: string) {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/auth/forgot-password", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("responde mensaje uniforme sin exists ni success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: true,
        status: 200,
        body: {
          message: GENERIC_MESSAGE,
          exists: true,
          success: true,
        },
      }),
    ) as unknown as typeof fetch

    const res = await POST(forgotRequest("alguien@ejemplo.com"))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(body.message).toMatch(/Si existe una cuenta/i)
    expect(body).not.toHaveProperty("exists")
    expect(body).not.toHaveProperty("success")
  })

  it("normaliza 404 de cuenta inexistente a 200 genérico", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 404,
        body: { message: "User not found" },
      }),
    ) as unknown as typeof fetch

    const res = await POST(forgotRequest("no-existe@ejemplo.com"))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(body).toEqual({ message: GENERIC_MESSAGE })
  })

  it("normaliza 400 con exists/success a 200 genérico", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 400,
        body: { exists: false, success: false, message: "No account" },
      }),
    ) as unknown as typeof fetch

    const res = await POST(forgotRequest("no-existe@ejemplo.com"))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(body).toEqual({ message: GENERIC_MESSAGE })
  })

  it("normaliza 400 con mensaje de cuenta no encontrada a 200 genérico", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 400,
        body: { message: "El correo no existe en el sistema" },
      }),
    ) as unknown as typeof fetch

    const res = await POST(forgotRequest("no-existe@ejemplo.com"))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(body).toEqual({ message: GENERIC_MESSAGE })
  })

  it("reenvía Retry-After en 429", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 429,
        body: { detail: "Demasiados intentos" },
        retryAfter: "30",
      }),
    ) as unknown as typeof fetch

    const res = await POST(forgotRequest("alguien@ejemplo.com"))
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("30")
  })

  it("reenvía 500 del backend sin normalizar", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 500,
        body: { message: "Internal error" },
      }),
    ) as unknown as typeof fetch

    const res = await POST(forgotRequest("alguien@ejemplo.com"))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(500)
    expect(body.message).toBe("Internal error")
  })

  it("reenvía 503 del backend sin normalizar", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 503,
        body: { message: "Service unavailable" },
      }),
    ) as unknown as typeof fetch

    const res = await POST(forgotRequest("alguien@ejemplo.com"))
    expect(res.status).toBe(503)
  })

  it("rechaza correo vacío sin llamar al backend", async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const res = await POST(forgotRequest(""))
    expect(res.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
