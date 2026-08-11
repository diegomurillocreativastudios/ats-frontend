import { describe, expect, it } from "vitest"
import { sanitizeTemplateHtml } from "@/lib/html/sanitize-template-html"

describe("sanitizeTemplateHtml", () => {
  it("strips script tags and inline event handlers", () => {
    const dirty =
      '<p onclick="alert(1)">ok</p><script>bad()</script><img src="x" onerror="alert(2)">'
    const clean = sanitizeTemplateHtml(dirty)
    expect(clean).not.toMatch(/<script/i)
    expect(clean).not.toMatch(/onclick/i)
    expect(clean).not.toMatch(/onerror/i)
    expect(clean).toContain("<p>ok</p>")
  })

  it("blocks javascript: URLs on anchors and images", () => {
    const dirty =
      '<a href="javascript:alert(1)">x</a><img src="javascript:alert(2)" alt="y">'
    const clean = sanitizeTemplateHtml(dirty)
    expect(clean).not.toMatch(/javascript:/i)
  })

  it("preserves legitimate report/list markup from raw placeholders", () => {
    const html =
      '<ul><li>Insight</li></ul><table><tbody><tr><td class="center">12</td></tr></tbody></table>'
    const clean = sanitizeTemplateHtml(html)
    expect(clean).toContain("<li>Insight</li>")
    expect(clean).toContain('<td class="center">12</td>')
  })

  it("preserves style blocks and data attributes used by templates", () => {
    const html =
      '<style data-report-base>.report-page{width:816px}</style><main class="report-page"><p>Hi</p></main>'
    const clean = sanitizeTemplateHtml(html)
    expect(clean).toContain("<style")
    expect(clean).toContain("data-report-base")
    expect(clean).toContain(".report-page{width:816px}")
    expect(clean).toContain('class="report-page"')
  })

  it("allows safe image data URIs and https src", () => {
    const html =
      '<img src="data:image/png;base64,abc=" alt=""><img src="https://cdn.example.com/logo.svg" alt="logo">'
    const clean = sanitizeTemplateHtml(html)
    expect(clean).toContain("data:image/png;base64,abc=")
    expect(clean).toContain("https://cdn.example.com/logo.svg")
  })

  it("sanitizes whole HTML documents without dropping body content", () => {
    const full =
      '<!DOCTYPE html><html><body><main class="technical-sheet-doc"><p onclick="x()">Safe</p><script>evil()</script></main></body></html>'
    const clean = sanitizeTemplateHtml(full)
    expect(clean).toMatch(/<html/i)
    expect(clean).toContain("Safe")
    expect(clean).not.toMatch(/<script/i)
    expect(clean).not.toMatch(/onclick/i)
  })
})
