import { afterEach, describe, expect, it, vi } from "vitest"
import { validateChromiumPackUrl } from "@/lib/pdf/validate-chromium-pack"

describe("validateChromiumPackUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("accepts a valid HEAD response with large tar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: {
          get: (name: string) => {
            if (name === "content-type") return "application/x-tar"
            if (name === "content-length") return String(60 * 1024 * 1024)
            return null
          },
        },
      })
    )

    await expect(
      validateChromiumPackUrl("https://example.com/chromium-pack.tar")
    ).resolves.toBeUndefined()
  })

  it("rejects non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: { get: () => null },
      })
    )

    await expect(validateChromiumPackUrl("https://example.com/missing.tar")).rejects.toThrow(
      /404/
    )
  })

  it("rejects suspiciously small pack", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: {
          get: (name: string) => {
            if (name === "content-type") return "text/html"
            if (name === "content-length") return "1200"
            return null
          },
        },
      })
    )

    await expect(validateChromiumPackUrl("https://example.com/fake.tar")).rejects.toThrow(
      /demasiado pequeño|content-type/
    )
  })
})
