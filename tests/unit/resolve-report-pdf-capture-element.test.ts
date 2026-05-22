import { describe, expect, it } from "vitest"
import { resolveReportPdfCaptureElement } from "@/lib/pdf/resolve-report-preview-pdf-element"

describe("resolveReportPdfCaptureElement", () => {
  it("prefers the preview wrapper that includes embedded styles", () => {
    const root = document.createElement("div")
    root.innerHTML = `
      <div class="report-preview-doc">
        <style>.report-page { width: 816px; }</style>
        <main class="report-page"><section class="section">x</section></main>
      </div>
    `

    const target = resolveReportPdfCaptureElement(root)
    expect(target?.classList.contains("report-preview-doc")).toBe(true)
  })

  it("resolves the preview wrapper when it is mounted inside a shadow root", () => {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const shadow = host.attachShadow({ mode: "open" })
    shadow.innerHTML = `
      <div class="report-preview-doc">
        <style>.report-page { width: 816px; }</style>
        <main class="report-page"><section class="section">x</section></main>
      </div>
    `

    const target = resolveReportPdfCaptureElement(host)
    expect(target?.classList.contains("report-preview-doc")).toBe(true)
    host.remove()
  })
})
