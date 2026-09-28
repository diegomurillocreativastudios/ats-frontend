import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  deleteRecruiterProfilePhoto,
  getRecruiterProfilePhoto,
  mapRecruiterProfilePhoto,
  uploadRecruiterProfilePhoto,
} from "@/lib/api/recruiter-profile-photo"

vi.mock("@/lib/auth/csrf-client", () => ({
  csrfHeaders: vi.fn(async (extra?: Record<string, string>) => ({
    ...(extra ?? {}),
    "x-csrf-token": "test-csrf",
  })),
}))

function jsonResponse(
  status: number,
  body: unknown,
  headers?: Record<string, string>
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => {
        const key = name.toLowerCase()
        if (key === "content-type") return "application/json"
        if (headers && key in headers) return headers[key]
        if (key === "retry-after") return headers?.["retry-after"] ?? null
        return null
      },
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

describe("mapRecruiterProfilePhoto", () => {
  it("arma un data URI seguro", () => {
    expect(
      mapRecruiterProfilePhoto({
        photoFileId: "p-1",
        contentType: "image/png",
        fileName: "avatar.png",
        sizeBytes: 3,
        base64: "YWJj",
      })
    ).toEqual({
      photoFileId: "p-1",
      contentType: "image/png",
      fileName: "avatar.png",
      sizeBytes: 3,
      dataUri: "data:image/png;base64,YWJj",
    })
  })

  it("rechaza SVG", () => {
    expect(
      mapRecruiterProfilePhoto({
        photoFileId: "p-1",
        contentType: "image/svg+xml",
        base64: "PHN2Zz4=",
      })
    ).toBeNull()
  })
})

describe("recruiter profile photo API", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    globalThis.fetch = originalFetch
  })

  it("GET 404 devuelve null", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      jsonResponse(404, { message: "No hay foto." })
    ) as unknown as typeof fetch

    await expect(getRecruiterProfilePhoto()).resolves.toBeNull()
  })

  it("PUT envía multipart a /api/auth/profile/photo", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        photoFileId: "p-1",
        contentType: "image/png",
        fileName: "avatar.png",
        sizeBytes: 4,
        base64: "YWJj",
      })
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const file = new File([new Uint8Array([1, 2, 3, 4])], "avatar.png", {
      type: "image/png",
    })

    const result = await uploadRecruiterProfilePhoto(file)

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/profile/photo",
      expect.objectContaining({
        method: "PUT",
        credentials: "include",
        body: expect.any(FormData),
      })
    )
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const form = init.body as FormData
    expect(form.get("photo")).toBeInstanceOf(File)
    expect(result.dataUri).toBe("data:image/png;base64,YWJj")
  })

  it("DELETE 204 no lanza", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: { get: () => null },
      json: async () => ({}),
      text: async () => "",
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await expect(deleteRecruiterProfilePhoto()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/profile/photo",
      expect.objectContaining({ method: "DELETE" })
    )
  })

  it("expone retryAfter en 429 sin reintentar", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(
        429,
        { message: "Demasiados intentos. Probá de nuevo más tarde." },
        { "retry-after": "20" }
      )
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const file = new File([new Uint8Array([1, 2, 3, 4])], "avatar.png", {
      type: "image/png",
    })

    await expect(uploadRecruiterProfilePhoto(file)).rejects.toMatchObject({
      status: 429,
      retryAfter: 20,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
