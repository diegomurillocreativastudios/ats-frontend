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
})
