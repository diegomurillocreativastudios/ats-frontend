import { describe, expect, it, vi } from "vitest"
import type { Page } from "puppeteer-core"
import {
  applyTechnicalSheetPdfPipeline,
  getTechnicalSheetPdfPageOptions,
  resolveSetContentTimeoutMs,
  waitForTechnicalSheetPdfDocumentAssets,
} from "@/lib/technical-sheet/html-to-pdf-chromium"
import { TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS } from "@/lib/technical-sheet/pdf-chromium-limits"

describe("applyTechnicalSheetPdfPipeline", () => {
  it("applies network policy, then emulateMediaType, setContent, evaluate, pdf", async () => {
    const order: string[] = []
    const page = {
      setRequestInterception: vi.fn(async () => {
        order.push("setRequestInterception")
      }),
      on: vi.fn(() => {
        order.push("onRequest")
      }),
      emulateMediaType: vi.fn(async () => {
        order.push("emulateMediaType")
      }),
      setContent: vi.fn(async () => {
        order.push("setContent")
      }),
      evaluate: vi.fn(async () => {
        order.push("evaluate")
      }),
      pdf: vi.fn(async () => {
        order.push("pdf")
        return new Uint8Array([37, 80, 68, 70])
      }),
    } as unknown as Page

    const buf = await applyTechnicalSheetPdfPipeline(page, "<html><body>x</body></html>", "print")

    expect(order).toEqual([
      "setRequestInterception",
      "onRequest",
      "emulateMediaType",
      "setContent",
      "evaluate",
      "pdf",
    ])
    expect(page.setRequestInterception).toHaveBeenCalledWith(true)
    expect(page.emulateMediaType).toHaveBeenCalledWith("print")
    expect(page.setContent).toHaveBeenCalledWith("<html><body>x</body></html>", {
      waitUntil: "load",
      timeout: TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS,
    })
    expect(page.pdf).toHaveBeenCalledWith(getTechnicalSheetPdfPageOptions())
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF")
  })
})

describe("waitForTechnicalSheetPdfDocumentAssets", () => {
  it("runs a single page.evaluate for fonts and images", async () => {
    const page = {
      evaluate: vi.fn(async () => {}),
    } as unknown as Page

    await waitForTechnicalSheetPdfDocumentAssets(page)

    expect(page.evaluate).toHaveBeenCalledTimes(1)
  })
})

describe("resolveSetContentTimeoutMs", () => {
  it("returns the fixed budget timeout", () => {
    expect(resolveSetContentTimeoutMs("x".repeat(50_000))).toBe(
      TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS
    )
    expect(resolveSetContentTimeoutMs("x".repeat(200_000))).toBe(
      TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS
    )
    expect(resolveSetContentTimeoutMs("x".repeat(500_000))).toBe(
      TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS
    )
  })
})

describe("getTechnicalSheetPdfPageOptions", () => {
  it("uses Letter, zero margins, printBackground and preferCSSPageSize", () => {
    const opts = getTechnicalSheetPdfPageOptions()
    expect(opts).toEqual({
      format: "Letter",
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
      preferCSSPageSize: true,
    })
  })
})
