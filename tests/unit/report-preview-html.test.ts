import { describe, expect, it } from "vitest"
import {
  REPORT_PRINT_PREVIEW_SCREEN_ZOOM,
  wrapReportPreviewHtml,
} from "@/lib/reportes/report-preview-html"

describe("wrapReportPreviewHtml", () => {
  it("wraps partial HTML in a preview document", () => {
    const doc = wrapReportPreviewHtml("<p>Resumen</p>")
    expect(doc).toContain("<main class=\"report-preview-doc\">")
    expect(doc).toContain("<p>Resumen</p>")
  })

  it("injects screen-only zoom when screenZoom is provided", () => {
    const doc = wrapReportPreviewHtml("<p>Resumen</p>", {
      screenZoom: REPORT_PRINT_PREVIEW_SCREEN_ZOOM,
    })
    expect(doc).toContain("@media screen")
    expect(doc).toContain(`zoom: ${REPORT_PRINT_PREVIEW_SCREEN_ZOOM}`)
  })

  it("returns sanitized full documents without re-wrapping", () => {
    const full =
      '<!DOCTYPE html><html><body><p onclick="alert(1)">OK</p><script>bad()</script></body></html>'
    const out = wrapReportPreviewHtml(full)
    expect(out).toMatch(/<html/i)
    expect(out).toContain("OK")
    expect(out).not.toMatch(/<script/i)
    expect(out).not.toMatch(/onclick/i)
    expect(out).not.toContain('class="report-preview-doc"')
  })

  it("strips XSS from partial HTML before wrapping", () => {
    const out = wrapReportPreviewHtml('<p>Safe</p><script>evil()</script>')
    expect(out).toContain('<main class="report-preview-doc">')
    expect(out).toContain("<p>Safe</p>")
    expect(out).not.toMatch(/<script/i)
  })
})
