import { describe, expect, it } from "vitest"
import { sanitizeTechnicalSheetPreviewHtml } from "@/lib/technical-sheet/sanitize-technical-sheet-preview-html"
import { isValidTechnicalSheetPreviewHtml } from "@/lib/technical-sheet/validate-technical-sheet-preview-html"

const baseDoc = `<!DOCTYPE html><html><body><main class="technical-sheet-doc"><section class="technical-sheet-page"></section></main></body></html>`

describe("sanitizeTechnicalSheetPreviewHtml", () => {
  it("strips script tags and on* handlers from template markup", () => {
    const dirty = `${baseDoc.replace("</body>", '<p onclick="alert(1)">x</p><script>bad()</script></body>')}`
    const clean = sanitizeTechnicalSheetPreviewHtml(dirty)
    expect(clean).not.toMatch(/<script/i)
    expect(clean).not.toMatch(/onclick/i)
    expect(isValidTechnicalSheetPreviewHtml(clean)).toBe(true)
  })
})
