import { describe, expect, it, afterEach, vi } from "vitest"
import { resolveTechnicalSheetPdfEngine } from "@/lib/technical-sheet/technical-sheet-pdf-engine"

describe("resolveTechnicalSheetPdfEngine", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("defaults to chromium", () => {
    vi.stubEnv("TECHNICAL_SHEET_PDF_ENGINE", "")
    expect(resolveTechnicalSheetPdfEngine(new Request("https://app.example/pdf"))).toBe("chromium")
  })

  it("selects pdfkit when env is pdfkit", () => {
    vi.stubEnv("TECHNICAL_SHEET_PDF_ENGINE", "pdfkit")
    expect(resolveTechnicalSheetPdfEngine(new Request("https://app.example/pdf"))).toBe("pdfkit")
  })

  it("selects pdfkit when query engine=pdfkit", () => {
    vi.stubEnv("TECHNICAL_SHEET_PDF_ENGINE", "")
    expect(
      resolveTechnicalSheetPdfEngine(new Request("https://app.example/pdf?engine=pdfkit"))
    ).toBe("pdfkit")
  })
})
