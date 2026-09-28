import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth/csrf-client", () => ({
  csrfHeaders: vi.fn(async (extra?: Record<string, string>) => ({
    ...(extra ?? {}),
    "x-csrf-token": "test-csrf-token",
  })),
  ensureCsrfToken: vi.fn(async () => "test-csrf-token"),
}))

import { apiClient, resolveBffUrl, type ApiClientError } from "@/lib/api"

describe("apiClient auth hardening (HttpOnly BFF)", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubGlobal(
      "window",
      Object.assign(globalThis.window ?? {}, {
        location: { origin: "http://localhost:3000", href: "" },
      })
    )
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("resuelve rutas relativas al puente /api/bff", () => {
    expect(resolveBffUrl("/api/Templates")).toBe("/api/bff/api/Templates")
    expect(resolveBffUrl("register")).toBe("/api/bff/register")
    expect(resolveBffUrl("/api/x.html?download=1")).toBe(
      "/api/bff/api/x.html?download=1"
    )
  })

  it("rechaza URLs absolutas (FE-SEC-021)", () => {
    expect(() => resolveBffUrl("https://evil.example/api")).toThrow(
      /URLs absolutas/
    )
  })

  it("no adjunta Authorization Bearer; usa credentials include", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => [{ id: 1 }],
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await apiClient.get("/api/Templates")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/bff/api/Templates")
    expect(init.credentials).toBe("include")
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it("adjunta X-CSRF-Token en mutaciones", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await apiClient.post("/register", { email: "a@b.com" })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/bff/register")
    const headers = init.headers as Record<string, string>
    expect(headers["x-csrf-token"]).toBe("test-csrf-token")
    expect(headers.Authorization).toBeUndefined()
  })

  it("expone headers de paging en getWithHeaders", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          const key = name.toLowerCase()
          if (key === "content-type") return "application/json"
          if (key === "x-total-count") return "80"
          if (key === "x-page") return "1"
          if (key === "x-page-size") return "50"
          return null
        },
      },
      json: async () => [{ id: 1 }],
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await apiClient.getWithHeaders("/api/recruiter/candidates/all")
    expect(result.data).toEqual([{ id: 1 }])
    expect(result.headers.get("X-Total-Count")).toBe("80")
  })

  it("expone retryAfter en errores 429", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "retry-after"
            ? "45"
            : name.toLowerCase() === "content-type"
              ? "application/json"
              : null,
      },
      json: async () => ({ message: "Demasiados intentos" }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await expect(apiClient.post("/register", { email: "a@b.com" })).rejects.toMatchObject({
      status: 429,
      retryAfter: 45,
    } satisfies Partial<ApiClientError>)
  })

  it("parsea application/problem+json y no usa el cuerpo crudo como mensaje", async () => {
    const problem = {
      type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
      title: "One or more validation errors occurred.",
      status: 400,
      errors: { id: ["The value 'id-invalido-00000-test' is not valid."] },
      traceId: "00-abc-def-00",
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? "application/problem+json" : null,
      },
      json: async () => problem,
      text: async () => JSON.stringify(problem),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    try {
      await apiClient.get("/api/recruiter/candidates/id-invalido-00000-test")
      throw new Error("expected request to fail")
    } catch (err) {
      const apiError = err as ApiClientError
      expect(apiError.status).toBe(400)
      expect(apiError.body).toEqual(problem)
      expect(apiError.message).not.toContain("traceId")
      expect(apiError.message.startsWith("{")).toBe(false)
    }
  })
})
