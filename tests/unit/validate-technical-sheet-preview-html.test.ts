import { describe, expect, it } from "vitest"
import { isValidTechnicalSheetPreviewHtml } from "@/lib/technical-sheet/validate-technical-sheet-preview-html"

const validDoc = `<!DOCTYPE html><html><head></head><body><main class="technical-sheet-doc"><section class="technical-sheet-page"></section></main></body></html>`

describe("isValidTechnicalSheetPreviewHtml", () => {
  it("accepts paginated technical sheet preview markup", () => {
    expect(isValidTechnicalSheetPreviewHtml(validDoc)).toBe(true)
  })

  it("rejects empty markup", () => {
    expect(isValidTechnicalSheetPreviewHtml("")).toBe(false)
  })

  it("rejects markup without required sheet classes", () => {
    expect(isValidTechnicalSheetPreviewHtml("<!DOCTYPE html><html><body><p>x</p></body></html>")).toBe(
      false
    )
  })
})
