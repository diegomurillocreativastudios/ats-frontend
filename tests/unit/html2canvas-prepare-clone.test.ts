import { describe, expect, it } from "vitest"
import {
  normalizeColorForHtml2Canvas,
  sanitizeCssTextForHtml2Canvas,
} from "@/lib/pdf/html2canvas-prepare-clone"

describe("html2canvas color sanitization", () => {
  it("leaves rgb/hex colors unchanged", () => {
    expect(normalizeColorForHtml2Canvas("#ff0000")).toBe("#ff0000")
    expect(normalizeColorForHtml2Canvas("rgb(10, 20, 30)")).toBe("rgb(10, 20, 30)")
  })

  it("replaces oklab() in CSS text", () => {
    const input = ".x { color: oklab(0.5 0.1 180); background: #fff; }"
    const out = sanitizeCssTextForHtml2Canvas(input)
    expect(out).not.toMatch(/oklab\(/i)
    expect(out).toContain("#fff")
  })
})
