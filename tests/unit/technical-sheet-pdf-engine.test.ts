import { describe, expect, it, afterEach, vi } from "vitest"
import { resolveTechnicalSheetPdfEngine } from "@/lib/technical-sheet/technical-sheet-pdf-engine"

describe("resolveTechnicalSheetPdfEngine", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("defaults to pdfkit", () => {
    vi.stubEnv("TECHNICAL_SHEET_PDF_ENGINE", "")
    expect(resolveTechnicalSheetPdfEngine(new Request("https://app.example/pdf"))).toBe("pdfkit")
  })

  it("selects chromium when env is chromium", () => {
    vi.stubEnv("TECHNICAL_SHEET_PDF_ENGINE", "chromium")
    expect(resolveTechnicalSheetPdfEngine(new Request("https://app.example/pdf"))).toBe("chromium")
  })

  it("selects chromium when query engine=chromium", () => {
    vi.stubEnv("TECHNICAL_SHEET_PDF_ENGINE", "")
    expect(
      resolveTechnicalSheetPdfEngine(new Request("https://app.example/pdf?engine=chromium"))
    ).toBe("chromium")
  })
})
