import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

vi.mock("@/lib/fetch-backend-session-user", () => ({
  fetchBackendSessionUser: vi.fn(async () => ({ status: "unavailable" })),
}))

import { POST } from "@/app/api/auth/register/otp/verify/route"
import { AUTH_COOKIES } from "@/lib/auth"

const INVALID_CODE_MESSAGE = "El código no es válido o venció."
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

function verifyRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/register/otp/verify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

const validBody = {
  email: "nuevo@ejemplo.com",
  code: "123456",
  password: "ClaveSegura1!",
}

describe("POST /api/auth/register/otp/verify", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("crea sesión con cookies y no expone accessToken en el body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: true,
        status: 200,
        body: {
          accessToken: "access-secret",
          refreshToken: "refresh-secret",
          expiresIn: 3600,
        },
      }),
    ) as unknown as typeof fetch

    const res = await POST(verifyRequest(validBody))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(body).not.toHaveProperty("accessToken")
    expect(body).not.toHaveProperty("refreshToken")
    expect(res.cookies.get(AUTH_COOKIES.access)?.value).toBe("access-secret")
    expect(res.cookies.get(AUTH_COOKIES.refresh)?.value).toBe("refresh-secret")
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/auth/register/otp/verify",
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

    const res = await POST(verifyRequest(validBody))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(401)
    expect(body.message).toBe(INVALID_CODE_MESSAGE)
    expect(JSON.stringify(body)).not.toContain("123456")
  })

  it("no confirma que el correo ya existe", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockBackendResponse({
        ok: false,
        status: 400,
        body: { detail: "El correo ya está registrado" },
      }),
    ) as unknown as typeof fetch

    const res = await POST(verifyRequest(validBody))
    const body = (await res.json()) as Record<string, unknown>

    expect(res.status).toBe(400)
    expect(body.message).toBe(GENERIC_REGISTER_ERROR)
    expect(String(body.message)).not.toMatch(/ya está registrado/i)
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

    const res = await POST(verifyRequest(validBody))
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("30")
  })

  it("rechaza body incompleto o código que no tiene 6 dígitos sin llamar al backend", async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    const missing = await POST(verifyRequest({ email: "a@b.com" }))
    const badCode = await POST(
      verifyRequest({ ...validBody, code: "12ab" }),
    )

    expect(missing.status).toBe(400)
    expect(badCode.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
