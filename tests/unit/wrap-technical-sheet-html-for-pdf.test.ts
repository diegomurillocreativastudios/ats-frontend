import { describe, expect, it } from "vitest"
import { ensureTechnicalSheetPdfDocument } from "@/lib/technical-sheet/wrap-technical-sheet-html-for-pdf"

describe("ensureTechnicalSheetPdfDocument", () => {
  it("wraps a fragment in a full document with @page letter margin 0", () => {
    const out = ensureTechnicalSheetPdfDocument("<main>Hi</main>")
    expect(out).toContain("<!DOCTYPE html>")
    expect(out).toContain("@page { size: letter; margin: 0; }")
    expect(out).not.toMatch(/size:\s*A4/i)
    expect(out).toContain("<main>Hi</main>")
    expect(out).toMatch(/<body[^>]*>\s*<main>Hi<\/main>\s*<\/body>/)
  })

  it("injects pdf root style before closing head when document is complete", () => {
    const doc =
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>t</title></head><body><p>x</p></body></html>"
    const out = ensureTechnicalSheetPdfDocument(doc)
    expect(out).toContain("@page { size: letter; margin: 0; }")
    expect(out.indexOf("data-technical-sheet-pdf-root")).toBeLessThan(out.indexOf("</head>"))
  })

  it("keeps letter wrap for very long body fragments (multipage source HTML)", () => {
    const long = `<main><article>${"<p>x</p>".repeat(400)}</article></main>`
    const out = ensureTechnicalSheetPdfDocument(long)
    expect(out).toContain("size: letter")
    expect(out).not.toContain("A4")
  })
})
