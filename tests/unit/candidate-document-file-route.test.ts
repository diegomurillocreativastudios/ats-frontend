import { beforeEach, describe, expect, it, vi } from "vitest"

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

import { GET } from "@/app/api/candidate/[id]/documents/[documentId]/route"

describe("GET /api/candidate/[id]/documents/[documentId]", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  it("proxies the backend download-by-id endpoint and streams bytes", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="cv.pdf"',
        },
      })
    )

    const response = await GET(new Request("https://app.example.com"), {
      params: Promise.resolve({ id: "cand-1", documentId: "doc-1" }),
    })

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.example.com/api/candidate/cand-1/documents/doc-1"
    )
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe("GET")
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer test-token")
    expect(response.headers.get("Content-Type")).toBe("application/pdf")
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    const body = new Uint8Array(await response.arrayBuffer())
    expect(Array.from(body)).toEqual([37, 80, 68, 70])
  })

  it("returns 404 when the backend reports the document missing", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Documento no encontrado" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })
    )

    const response = await GET(new Request("https://app.example.com"), {
      params: Promise.resolve({ id: "cand-1", documentId: "missing" }),
    })

    expect(response.status).toBe(404)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const payload = (await response.json()) as { message?: string }
    expect(payload.message).toBeTruthy()
    expect(payload.message).not.toMatch(/cvs\//i)
  })
})
