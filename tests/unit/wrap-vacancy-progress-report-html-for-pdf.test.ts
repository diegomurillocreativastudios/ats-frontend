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
    expect(out).not.toMatch(/@page\s*\{\s*size:[^}]*\}\s*<\/style>\s*<style[^>]+data-technical-sheet-pdf-root/)
  })

  it("leaves the template @page rule untouched (no override injection)", () => {
    const fragment = `<style>@page { size: Letter; margin: 14mm 12mm 16mm 12mm; }</style><main>x</main>`
    const out = wrapVacancyProgressReportHtmlForPdf(fragment)
    const pageMatches = out.match(/@page\s*\{[^}]*\}/g) ?? []
    expect(pageMatches.length).toBe(1)
    expect(pageMatches[0]).toContain("14mm 12mm 16mm 12mm")
  })

  it("returns a minimal empty document for empty input", () => {
    const out = wrapVacancyProgressReportHtmlForPdf("   ")
    expect(out).toContain("<!DOCTYPE html>")
    expect(out).toContain("<body></body>")
  })

  it("does not double-wrap a full HTML document", () => {
    const doc = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" /></head><body><main>x</main></body></html>`
    const out = wrapVacancyProgressReportHtmlForPdf(doc)
    expect(out).toBe(doc)
  })

  it("injects head when html has no head", () => {
    const doc = `<!DOCTYPE html><html lang="es"><body><main>x</main></body></html>`
    const out = wrapVacancyProgressReportHtmlForPdf(doc)
    expect(out).toContain("<head>")
    expect(out).toContain('<meta charset="utf-8" />')
    expect(out).toContain("<main>x</main>")
  })
})
