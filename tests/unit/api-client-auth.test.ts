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

  it("keeps a small multipart body on the same-origin BFF", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ id: "logo" }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const formData = new FormData()
    formData.append("name", "Acme")
    await apiClient.postFormData("/api/admin/companies", formData)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/bff/api/admin/companies")
    expect(init.credentials).toBe("include")
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it("posts a CV over 4 MB directly to the API without cookies", async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url === "/api/auth/upload-grant") {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({
            direct: true,
            apiBaseUrl: "https://api.example.com",
            accessToken: "session-token",
          }),
        }
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ id: "doc-1" }),
      }
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const formData = new FormData()
    formData.append(
      "file",
      new File([new Uint8Array(4_200_000)], "cv.pdf", { type: "application/pdf" })
    )

    await apiClient.postFormData("/api/candidate/cand-1/documents", formData)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [grantUrl, grantInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(grantUrl).toBe("/api/auth/upload-grant")
    expect(grantInit.credentials).toBe("include")

    const [uploadUrl, uploadInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(uploadUrl).toBe(
      "https://api.example.com/api/candidate/cand-1/documents"
    )
    expect(uploadInit.credentials).toBe("omit")
    expect(uploadInit.body).toBe(formData)
    expect((uploadInit.headers as Record<string, string>).Authorization).toBe(
      "Bearer session-token"
    )
  })

  it("posts a large public CV without a bearer when there is no session", async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url === "/api/auth/upload-grant") {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({
            direct: true,
            apiBaseUrl: "https://api.example.com",
            accessToken: null,
          }),
        }
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "text/plain" },
        text: async () => "Application pipeline executed successfully.",
      }
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const formData = new FormData()
    formData.append(
      "cvFile",
      new File([new Uint8Array(4_200_000)], "cv.pdf", { type: "application/pdf" })
    )

    const result = await apiClient.postFormData(
      "/api/candidate/personal-appliance",
      formData
    )

    expect(result).toBe("Application pipeline executed successfully.")
    const [, uploadInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(uploadInit.credentials).toBe("omit")
    expect((uploadInit.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it("posts a large CV through the BFF when the grant is not direct", async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url === "/api/auth/upload-grant") {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({ direct: false }),
        }
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ id: "doc-1" }),
      }
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const formData = new FormData()
    formData.append(
      "file",
      new File([new Uint8Array(4_200_000)], "cv.pdf", { type: "application/pdf" })
    )

    await apiClient.postFormData("/api/candidate/cand-1/documents", formData)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [uploadUrl, uploadInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(uploadUrl).toBe("/api/bff/api/candidate/cand-1/documents")
    expect(uploadInit.credentials).toBe("include")
    expect((uploadInit.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it("does not fall back to the BFF when the grant fails", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      headers: { get: () => "application/json" },
      json: async () => ({
        message:
          "No se puede enviar este archivo porque la URL pública del API no está configurada.",
      }),
    }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const formData = new FormData()
    formData.append(
      "file",
      new File([new Uint8Array(4_200_000)], "cv.pdf", { type: "application/pdf" })
    )

    await expect(
      apiClient.postFormData("/api/candidate/cand-1/documents", formData)
    ).rejects.toMatchObject({ status: 500 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
