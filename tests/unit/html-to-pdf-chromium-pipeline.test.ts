import { describe, expect, it, vi } from "vitest"
import type { Page } from "puppeteer-core"
import {
  applyTechnicalSheetPdfPipeline,
  getTechnicalSheetPdfPageOptions,
  waitForTechnicalSheetPdfDocumentAssets,
} from "@/lib/technical-sheet/html-to-pdf-chromium"

describe("applyTechnicalSheetPdfPipeline", () => {
  it("calls emulateMediaType, setContent, evaluate, then pdf with Letter and zero margins", async () => {
    const order: string[] = []
    const page = {
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

    expect(order).toEqual(["emulateMediaType", "setContent", "evaluate", "pdf"])
    expect(page.emulateMediaType).toHaveBeenCalledWith("print")
    expect(page.setContent).toHaveBeenCalledWith("<html><body>x</body></html>", {
      waitUntil: "load",
      timeout: 60_000,
    })
    expect(page.pdf).toHaveBeenCalledWith(getTechnicalSheetPdfPageOptions())
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF")
  })

  it("honors optional setContent waitUntil and timeout", async () => {
    const page = {
      emulateMediaType: vi.fn(async () => {}),
      setContent: vi.fn(async () => {}),
      evaluate: vi.fn(async () => {}),
      pdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
    } as unknown as Page

    await applyTechnicalSheetPdfPipeline(page, "<html></html>", "screen", undefined, {
      waitUntil: "domcontentloaded",
      timeoutMs: 42_000,
    })

    expect(page.setContent).toHaveBeenCalledWith("<html></html>", {
      waitUntil: "domcontentloaded",
      timeout: 42_000,
    })
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
