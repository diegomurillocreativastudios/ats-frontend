import { describe, expect, it } from "vitest"
import { resolveReportPdfCaptureElement } from "@/lib/pdf/resolve-report-preview-pdf-element"

describe("resolveReportPdfCaptureElement", () => {
  it("prefers main.report-preview-doc", () => {
    const root = document.createElement("div")
    const main = document.createElement("main")
    main.className = "report-preview-doc"
    root.appendChild(main)
    expect(resolveReportPdfCaptureElement(root)).toBe(main)
  })

  it("falls back to article", () => {
    const root = document.createElement("div")
    const article = document.createElement("article")
    root.appendChild(article)
    expect(resolveReportPdfCaptureElement(root)).toBe(article)
  })
})
