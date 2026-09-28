import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

import { POST } from "@/app/api/auth/register/otp/check/route"

const INVALID_CODE_MESSAGE = "El código no es válido o venció."
const CHECK_OK_MESSAGE = "El código es válido."
const GENERIC_REGISTER_ERROR =
  "No se pudo completar el registro. Revisá los datos e intentá de nuevo."

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

function checkRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/register/otp/check", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

const validBody = {
  email: "nuevo@ejemplo.com",
  code: "123456",
}

describe("POST /api/auth/register/otp/check", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("confirma el código sin crear sesión", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: true,
        status: 200,
        body: { message: CHECK_OK_MESSAGE },
      }),
    ) as unknown as typeof fetch

    const res = await POST(checkRequest(validBody))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(body).toEqual({ message: CHECK_OK_MESSAGE })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/auth/register/otp/check",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(validBody),
      }),
    )
  })

  it("devuelve 401 genérico si el código es inválido o venció", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 401,
        body: { detail: "challenge consumed for 123456" },
      }),
    ) as unknown as typeof fetch

    const res = await POST(checkRequest(validBody))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(401)
    expect(body.message).toBe(INVALID_CODE_MESSAGE)
    expect(JSON.stringify(body)).not.toContain("123456")
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

    const res = await POST(checkRequest(validBody))
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("30")
  })

  it("rechaza body incompleto o código que no tiene 6 dígitos sin llamar al backend", async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const missing = await POST(checkRequest({ email: "a@b.com" }))
    const badCode = await POST(checkRequest({ ...validBody, code: "12ab" }))

    expect(missing.status).toBe(400)
    expect(badCode.status).toBe(400)
    expect((await missing.json()).message).toBe(GENERIC_REGISTER_ERROR)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
