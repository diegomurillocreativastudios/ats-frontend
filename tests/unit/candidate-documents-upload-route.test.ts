import { beforeEach, describe, expect, it, vi } from "vitest"
import { UPLOAD_MAX_BYTES_15_MB } from "@/lib/upload-constraints"

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => ({ value: "test-token" }),
  })),
}))

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIES: { access: "ats_access_token" },
}))

vi.mock("@/lib/server-backend-url", () => ({
  getServerBackendBaseUrl: () => "https://api.example.com",
}))

import { POST } from "@/app/api/candidate/[id]/documents/route"

describe("POST /api/candidate/[id]/documents", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("returns 413 when Content-Length exceeds the documents upload limit", async () => {
    const request = new Request(
      "https://app.example.com/api/candidate/cand-1/documents",
      {
        method: "POST",
        headers: {
          "content-type": "multipart/form-data; boundary=abc",
          "content-length": String(UPLOAD_MAX_BYTES_15_MB + 1),
        },
        body: "x",
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ id: "cand-1" }),
    })

    expect(response.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
    const payload = (await response.json()) as { message?: string }
    expect(payload.message).toContain("límite")
  })

  it("forwards the raw body without parsing formData", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "doc-1",
          storagePath: null,
          createdAt: "2026-01-01T00:00:00Z",
          contentSha256: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    )

    const bodyBytes = new Uint8Array([1, 2, 3, 4])
    const request = new Request(
      "https://app.example.com/api/candidate/cand-1/documents",
      {
        method: "POST",
        headers: {
          "content-type": "multipart/form-data; boundary=abc",
        },
        body: bodyBytes,
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ id: "cand-1" }),
    })

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.example.com/api/candidate/cand-1/documents")
    expect(init.method).toBe("POST")
    expect(init.body).toBeInstanceOf(ArrayBuffer)
    expect((init.body as ArrayBuffer).byteLength).toBe(4)
    const headers = new Headers(init.headers)
    expect(headers.get("Authorization")).toBe("Bearer test-token")
    expect(headers.get("Content-Type")).toContain("multipart/form-data")
  })

  it("returns 400 for an empty body", async () => {
    const request = new Request(
      "https://app.example.com/api/candidate/cand-1/documents",
      {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=abc" },
        body: new Uint8Array([]),
      }
    )

    const response = await POST(request, {
      params: Promise.resolve({ id: "cand-1" }),
    })

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
