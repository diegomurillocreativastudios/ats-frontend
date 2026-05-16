import type { Browser, Page, PDFOptions, SetContentWaitForOptions } from "puppeteer-core"
import { isVercelPdfRuntime, launchPdfBrowser } from "@/lib/pdf/launch-pdf-browser"

const PDF_IMAGE_WAIT_MS = 15_000

export function getTechnicalSheetPdfMediaType(): "screen" | "print" {
  const v = process.env.TECHNICAL_SHEET_PDF_MEDIA_TYPE?.trim().toLowerCase()
  return v === "print" ? "print" : "screen"
}

export async function waitForTechnicalSheetPdfDocumentAssets(
  page: Page,
  imageWaitMs: number = PDF_IMAGE_WAIT_MS
): Promise<void> {
  await page.evaluate(async (waitMs: number) => {
    if (document.fonts?.ready) await document.fonts.ready

    const imgs = Array.from(document.images)
    const waitOne = (img: HTMLImageElement) =>
      new Promise<void>((resolve) => {
        if (img.complete && img.naturalHeight !== 0) {
          resolve()
          return
        }
        const done = () => {
          window.clearTimeout(tid)
          resolve()
        }
        const tid = window.setTimeout(done, waitMs)
        img.addEventListener("load", done, { once: true })
        img.addEventListener("error", done, { once: true })
      })

    await Promise.all(imgs.map((img) => waitOne(img)))

    await Promise.all(
      imgs.map(async (img) => {
        try {
          if (typeof img.decode === "function") await img.decode()
        } catch {
          /* decode puede fallar en data URI corrupto; el PDF sigue */
        }
      })
    )
  }, imageWaitMs)
}

const TECHNICAL_SHEET_PDF_OPTIONS = {
  format: "Letter" as const,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  printBackground: true,
  preferCSSPageSize: true,
}

export function getTechnicalSheetPdfPageOptions(): typeof TECHNICAL_SHEET_PDF_OPTIONS {
  return { ...TECHNICAL_SHEET_PDF_OPTIONS }
}

export interface PdfSetContentOptions {
  waitUntil?: SetContentWaitForOptions["waitUntil"]
  timeoutMs?: number
}

export type PdfPipelinePhaseName = "setContent" | "waitAssets" | "pagePdf"

export async function applyTechnicalSheetPdfPipeline(
  page: Page,
  html: string,
  mediaType: "screen" | "print",
  pdfOverrides?: PDFOptions,
  setContentOptions?: PdfSetContentOptions,
  onPdfPipelinePhase?: (phase: PdfPipelinePhaseName, durationMs: number) => void,
  imageWaitMs?: number
): Promise<Buffer> {
  await page.emulateMediaType(mediaType)
  let stepStart = performance.now()
  await page.setContent(html, {
    waitUntil: setContentOptions?.waitUntil ?? "load",
    timeout: setContentOptions?.timeoutMs ?? 60_000,
  })
  onPdfPipelinePhase?.("setContent", performance.now() - stepStart)
  stepStart = performance.now()
  await waitForTechnicalSheetPdfDocumentAssets(page, imageWaitMs)
  onPdfPipelinePhase?.("waitAssets", performance.now() - stepStart)
  stepStart = performance.now()
  const buf = await page.pdf({
    ...getTechnicalSheetPdfPageOptions(),
    ...pdfOverrides,
  })
  onPdfPipelinePhase?.("pagePdf", performance.now() - stepStart)
  return Buffer.from(buf)
}

export async function enablePdfPageBlockExternalResources(page: Page): Promise<void> {
  await page.setRequestInterception(true)
  page.on("request", (request) => {
    const url = request.url()
    if (url === "about:blank" || url.startsWith("data:")) {
      void request.continue()
      return
    }
    const type = request.resourceType()
    if (type === "document" || type === "script") {
      void request.continue()
      return
    }
    void request.abort()
  })
}

export interface RenderHtmlToPdfBufferOptions {
  mediaType?: "screen" | "print"
  pdf?: PDFOptions
  viewport?: { width: number; height: number }
  setContent?: PdfSetContentOptions
  onPdfPipelinePhase?: (phase: PdfPipelinePhaseName, durationMs: number) => void
  imageWaitMs?: number
  blockExternalResources?: boolean
}

export async function renderHtmlToPdfBuffer(
  html: string,
  options?: RenderHtmlToPdfBufferOptions
): Promise<Buffer> {
  let browser: Browser | undefined
  try {
    browser = await launchPdfBrowser({
      defaultViewport: isVercelPdfRuntime() ? undefined : { width: 1280, height: 1600 },
      timeout: isVercelPdfRuntime() ? 120_000 : 30_000,
    })
    const page = await browser.newPage()
    try {
      if (options?.viewport) {
        await page.setViewport(options.viewport)
      }
      if (options?.blockExternalResources) {
        await enablePdfPageBlockExternalResources(page)
      }
      return await applyTechnicalSheetPdfPipeline(
        page,
        html,
        options?.mediaType ?? "print",
        options?.pdf,
        options?.setContent,
        options?.onPdfPipelinePhase,
        options?.imageWaitMs
      )
    } finally {
      await page.close().catch(() => {})
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}
