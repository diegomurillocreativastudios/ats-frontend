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

import { GET, POST } from "@/app/api/candidate/[id]/documents/route"

describe("GET /api/candidate/[id]/documents", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("returns a public DTO without storagePath or contentSha256", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "doc-1",
            storagePath: "cvs/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee_cv.pdf",
            createdAt: "2026-01-01T00:00:00Z",
            contentSha256: "abc123",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    )

    const response = await GET(new Request("https://app.example.com"), {
      params: Promise.resolve({ id: "cand-1" }),
    })

    expect(response.status).toBe(200)
    const payload = (await response.json()) as Record<string, unknown>[]
    expect(payload).toHaveLength(1)
    expect(payload[0]).toEqual({
      id: "doc-1",
      fileName: "cv.pdf",
      createdAt: "2026-01-01T00:00:00Z",
    })
    expect(payload[0]).not.toHaveProperty("storagePath")
    expect(payload[0]).not.toHaveProperty("contentSha256")
  })

  it("passes through public fileName from the backend without deriving from path", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "doc-2",
            fileName: "Curriculum.pdf",
            createdAt: "2026-03-01T00:00:00Z",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    )

    const response = await GET(new Request("https://app.example.com"), {
      params: Promise.resolve({ id: "cand-1" }),
    })

    expect(response.status).toBe(200)
    const payload = (await response.json()) as Record<string, unknown>[]
    expect(payload[0]).toEqual({
      id: "doc-2",
      fileName: "Curriculum.pdf",
      createdAt: "2026-03-01T00:00:00Z",
    })
  })
})

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

  it("forwards the raw body and strips storage secrets from the response", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "doc-1",
          fileName: "secret.pdf",
          createdAt: "2026-01-01T00:00:00Z",
          storagePath: "cvs/secret.pdf",
          contentSha256: "hash",
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

    const payload = (await response.json()) as Record<string, unknown>
    expect(payload).toEqual({
      id: "doc-1",
      fileName: "secret.pdf",
      createdAt: "2026-01-01T00:00:00Z",
    })
    expect(payload).not.toHaveProperty("storagePath")
    expect(payload).not.toHaveProperty("contentSha256")
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
