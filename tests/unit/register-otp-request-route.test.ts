import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

import { POST } from "@/app/api/auth/register/otp/request/route"

const UNIFORM_MESSAGE =
  "Si el correo es válido, te enviamos un código."

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

function requestOtp(email: string) {
  return new NextRequest("http://localhost/api/auth/register/otp/request", {
    method: "POST",
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/auth/register/otp/request", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("responde 200 uniforme y no filtra exists/success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: true,
        status: 200,
        body: {
          message: UNIFORM_MESSAGE,
          exists: true,
          success: true,
        },
      }),
    ) as unknown as typeof fetch

    const res = await POST(requestOtp("nuevo@ejemplo.com"))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(body).toEqual({ message: UNIFORM_MESSAGE })
    expect(body).not.toHaveProperty("exists")
    expect(body).not.toHaveProperty("success")
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/auth/register/otp/request",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "nuevo@ejemplo.com" }),
      }),
    )
  })

  it("normaliza 404 o cuenta existente a 200 uniforme (anti-enumeración)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 404,
        body: { message: "User already exists" },
      }),
    ) as unknown as typeof fetch

    const res = await POST(requestOtp("ya-existe@ejemplo.com"))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(body).toEqual({ message: UNIFORM_MESSAGE })
  })

  it("reenvía Retry-After en 429", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 429,
        body: { detail: "Demasiados intentos" },
        retryAfter: "45",
      }),
    ) as unknown as typeof fetch

    const res = await POST(requestOtp("alguien@ejemplo.com"))
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("45")
  })

  it("rechaza correo vacío o inválido sin llamar al backend", async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const empty = await POST(requestOtp(""))
    const invalid = await POST(requestOtp("no-es-email"))

    expect(empty.status).toBe(400)
    expect(invalid.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("normaliza 500 del backend a mensaje genérico", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 500,
        body: { message: "Internal error" },
      }),
    ) as unknown as typeof fetch

    const res = await POST(requestOtp("alguien@ejemplo.com"))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(500)
    expect(body.message).not.toBe("Internal error")
  })
})
