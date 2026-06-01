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

  it("returns full documents unchanged", () => {
    const full = "<!DOCTYPE html><html><body><p>OK</p></body></html>"
    expect(wrapReportPreviewHtml(full)).toBe(full)
  })
})
