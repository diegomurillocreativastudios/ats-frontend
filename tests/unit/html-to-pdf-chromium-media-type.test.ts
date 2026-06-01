import { describe, expect, it, afterEach, vi } from "vitest"
import { getTechnicalSheetPdfMediaType } from "@/lib/technical-sheet/html-to-pdf-chromium"

describe("getTechnicalSheetPdfMediaType", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("defaults to screen", () => {
    vi.stubEnv("TECHNICAL_SHEET_PDF_MEDIA_TYPE", "")
    expect(getTechnicalSheetPdfMediaType()).toBe("screen")
  })

  it("returns print when env is print", () => {
    vi.stubEnv("TECHNICAL_SHEET_PDF_MEDIA_TYPE", "print")
    expect(getTechnicalSheetPdfMediaType()).toBe("print")
  })
})
