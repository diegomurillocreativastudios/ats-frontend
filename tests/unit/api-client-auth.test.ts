import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth", () => ({
  getAccessToken: vi.fn(() => "test-access-token"),
}))

import { getAccessToken } from "@/lib/auth"
import { apiClient, type ApiClientError } from "@/lib/api"

describe("apiClient auth hardening", () => {
  const originalFetch = globalThis.fetch
  const originalEnv = process.env.NEXT_PUBLIC_API_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com"
    vi.mocked(getAccessToken).mockReturnValue("test-access-token")
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.NEXT_PUBLIC_API_URL = originalEnv
    vi.restoreAllMocks()
  })

  it("adjunta Authorization Bearer cuando hay token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => [{ id: 1 }],
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await apiClient.get("/api/Templates")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe("Bearer test-access-token")
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
