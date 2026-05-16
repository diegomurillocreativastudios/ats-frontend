import { afterEach, describe, expect, it, vi } from "vitest"
import {
  redactChromiumPackUrl,
  validateChromiumPackUrl,
} from "@/lib/pdf/validate-chromium-pack"

const largeTarHeaders = {
  get: (name: string) => {
    if (name === "content-type") return "application/x-tar"
    if (name === "content-length") return String(60 * 1024 * 1024)
    if (name === "content-range") return "bytes 0-1023/62914560"
    return null
  },
}

describe("redactChromiumPackUrl", () => {
  it("strips query params and hash", () => {
    expect(
      redactChromiumPackUrl("https://app.vercel.app/chromium-pack.tar?token=secret#frag")
    ).toBe("https://app.vercel.app/chromium-pack.tar")
  })
})

describe("validateChromiumPackUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.REPORT_PDF_SKIP_CHROMIUM_PACK_VALIDATION
  })

  it("accepts a valid HEAD response with large tar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: largeTarHeaders,
      })
    )

    await expect(
      validateChromiumPackUrl("https://example.com/chromium-pack.tar")
    ).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/chromium-pack.tar",
      expect.objectContaining({ method: "HEAD" })
    )
  })

  it("falls back to GET Range when HEAD returns 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: { get: () => null },
        body: null,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 206,
        statusText: "Partial Content",
        headers: largeTarHeaders,
        body: { cancel: vi.fn().mockResolvedValue(undefined) },
      })

    vi.stubGlobal("fetch", fetchMock)

    await expect(
      validateChromiumPackUrl("https://example.com/chromium-pack.tar")
    ).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/chromium-pack.tar",
      expect.objectContaining({
        method: "GET",
        headers: { Range: "bytes=0-1023" },
      })
    )
  })

  it("accepts GET Range 200 and cancels body without reading full file", async () => {
    const cancel = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          headers: { get: () => null },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: largeTarHeaders,
          body: { cancel },
        })
    )

    await expect(
      validateChromiumPackUrl("https://example.com/chromium-pack.tar")
    ).resolves.toBeUndefined()
    expect(cancel).toHaveBeenCalled()
  })

  it("skips validation when REPORT_PDF_SKIP_CHROMIUM_PACK_VALIDATION=1", async () => {
    process.env.REPORT_PDF_SKIP_CHROMIUM_PACK_VALIDATION = "1"
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      validateChromiumPackUrl("https://example.com/chromium-pack.tar")
    ).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects when HEAD and GET Range both fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          headers: { get: () => null },
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          headers: { get: () => null },
          body: { cancel: vi.fn().mockResolvedValue(undefined) },
        })
    )

    await expect(validateChromiumPackUrl("https://example.com/missing.tar")).rejects.toThrow(
      /GET Range.*404/
    )
  })

  it("rejects suspiciously small pack on GET Range", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 405,
          statusText: "Method Not Allowed",
          headers: { get: () => null },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 206,
          statusText: "Partial Content",
          headers: {
            get: (name: string) => {
              if (name === "content-type") return "text/html"
              if (name === "content-range") return "bytes 0-1023/1200"
              return null
            },
          },
          body: { cancel: vi.fn().mockResolvedValue(undefined) },
        })
    )

    await expect(validateChromiumPackUrl("https://example.com/fake.tar")).rejects.toThrow(
      /content-type|demasiado pequeño/
    )
  })
})
