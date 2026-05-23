import { describe, expect, it } from "vitest"
import { wrapVacancyProgressReportHtmlForPdf } from "@/lib/reportes/wrap-vacancy-progress-report-html-for-pdf"

describe("wrapVacancyProgressReportHtmlForPdf", () => {
  it("wraps a fragment with a full HTML document and utf-8 meta", () => {
    const fragment = `<style>@page { size: Letter; margin: 14mm 12mm 16mm 12mm; }</style><main class="report-page">hi</main>`
    const out = wrapVacancyProgressReportHtmlForPdf(fragment)
    expect(out.startsWith("<!DOCTYPE html>")).toBe(true)
    expect(out).toContain('<html lang="es">')
    expect(out).toContain('<meta charset="utf-8" />')
    expect(out).toContain('class="report-page"')
  })

  it("injects defensive wrapper CSS (page geometry + safety rules)", () => {
    const fragment = `<style>@page { size: Letter; margin: 14mm; }</style><main class="report-page">x</main>`
    const out = wrapVacancyProgressReportHtmlForPdf(fragment)
    expect(out).toContain("data-report-pdf-wrapper")
    expect(out).toContain("size: Letter portrait")
    expect(out).toContain("transform: none !important")
    expect(out).toContain("zoom: 1 !important")
    expect(out).toContain("page-break-after: always")
  })

  it("preserves the template @page rule so it can override the wrapper defaults", () => {
    const fragment = `<style>@page { size: Letter; margin: 14mm 12mm 16mm 12mm; }</style><main>x</main>`
    const out = wrapVacancyProgressReportHtmlForPdf(fragment)
    expect(out).toContain("14mm 12mm 16mm 12mm")
  })

  it("returns a minimal document with wrapper CSS for empty input", () => {
    const out = wrapVacancyProgressReportHtmlForPdf("   ")
    expect(out).toContain("<!DOCTYPE html>")
    expect(out).toContain("<body></body>")
    expect(out).toContain("data-report-pdf-wrapper")
  })

  it("injects head + wrapper styles into html with no head", () => {
    const doc = `<!DOCTYPE html><html lang="es"><body><main>x</main></body></html>`
    const out = wrapVacancyProgressReportHtmlForPdf(doc)
    expect(out).toContain("<head>")
    expect(out).toContain('<meta charset="utf-8" />')
    expect(out).toContain("data-report-pdf-wrapper")
    expect(out).toContain("<main>x</main>")
  })

  it("injects wrapper styles into existing head", () => {
    const doc = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" /></head><body><main>x</main></body></html>`
    const out = wrapVacancyProgressReportHtmlForPdf(doc)
    expect(out).toContain("data-report-pdf-wrapper")
    expect(out).toContain("<main>x</main>")
  })
})
