import { describe, expect, it } from "vitest"
import {
  buildReportViewPdfHtmlDocument,
  REPORT_PDF_BASE_CSS,
} from "@/lib/reportes/build-report-view-pdf-html"

describe("buildReportViewPdfHtmlDocument", () => {
  it("builds a full HTML document with base PDF CSS and fragment in body", () => {
    const html = buildReportViewPdfHtmlDocument({
      baseOrigin: "https://app.example.com",
      fragmentHtml: "<main><p>Hola</p></main>",
      stylesheetHrefs: ["https://app.example.com/_next/static/css/app.css"],
      inlineHeadCss: ".x{color:red}",
    })

    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('<html lang="es">')
    expect(html).toContain('<meta charset="utf-8"/>')
    expect(html).toContain("viewport")
    expect(html).toContain(REPORT_PDF_BASE_CSS)
    expect(html).toContain('[data-report-pdf-exclude="true"]')
    expect(html).toContain(".x{color:red}")
    expect(html).toContain('<link rel="stylesheet" href="https://app.example.com/_next/static/css/app.css"/>')
    expect(html).toContain("<main><p>Hola</p></main>")
  })

  it("allows empty stylesheetHrefs and inlineHeadCss", () => {
    const html = buildReportViewPdfHtmlDocument({
      baseOrigin: "http://localhost:3000",
      fragmentHtml: "<div>ok</div>",
      stylesheetHrefs: [],
      inlineHeadCss: "",
    })

    expect(html).not.toContain('<link rel="stylesheet"')
    expect(html).toContain("ok")
  })
})
