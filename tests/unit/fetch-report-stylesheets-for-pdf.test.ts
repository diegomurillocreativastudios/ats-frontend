import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchStylesheetsTextForPdf } from "@/lib/reportes/fetch-report-stylesheets-for-pdf"

describe("fetchStylesheetsTextForPdf", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns empty string when budget is zero", async () => {
    const out = await fetchStylesheetsTextForPdf(["https://example.com/a.css"], 0)
    expect(out).toBe("")
  })

  it("concatenates successful CSS responses and respects budget", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("a.css")) {
          return { ok: true, text: async () => ".a{color:red}".repeat(100) } as Response
        }
        if (url.endsWith("b.css")) {
          return { ok: true, text: async () => ".b{color:blue}" } as Response
        }
        return { ok: false, text: async () => "" } as Response
      })
    )

    const out = await fetchStylesheetsTextForPdf(
      ["https://cdn.example/a.css", "https://cdn.example/b.css"],
      500
    )
    expect(out).toContain("pdf-inlined:")
    expect(out).toContain(".a{color:red}")
    expect(out.length).toBeLessThanOrEqual(500)
  })
})
