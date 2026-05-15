import { existsSync } from "node:fs"
import type { Browser, Page, PDFOptions } from "puppeteer-core"
import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium"

/**
 * Entorno PDF headless:
 * - `VERCEL` / `VERCEL_ENV`: Chromium binary from `@sparticuz/chromium`.
 * - `PUPPETEER_EXECUTABLE_PATH`: Chrome/Chromium locally o en Docker (GCP).
 * - `TECHNICAL_SHEET_PDF_MEDIA_TYPE`: solo afecta pruebas o llamadas directas a `applyTechnicalSheetPdfPipeline`;
 *   por defecto `renderHtmlToPdfBuffer` usa `print` para aplicar `@media print` de la plantilla de ficha técnica.
 */

const LOCAL_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
] as const

const PDF_IMAGE_WAIT_MS = 15_000

function resolveLocalChromeExecutable(): string | null {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim()
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  for (const p of LOCAL_CHROME_CANDIDATES) {
    if (existsSync(p)) return p
  }
  return null
}

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
}

/**
 * Resolves the Chromium/Chrome binary for PDF generation.
 * - Vercel: `@sparticuz/chromium`.
 * - Local/GCP: `PUPPETEER_EXECUTABLE_PATH` or a standard Chrome install path.
 */
export async function resolveChromiumExecutablePathForPdf(): Promise<string> {
  if (isVercelRuntime()) {
    return chromium.executablePath()
  }
  const local = resolveLocalChromeExecutable()
  if (local) return local
  throw new Error(
    "No browser found for PDF generation. Set PUPPETEER_EXECUTABLE_PATH to Chrome/Chromium, or install Google Chrome."
  )
}

export function getTechnicalSheetPdfMediaType(): "screen" | "print" {
  const v = process.env.TECHNICAL_SHEET_PDF_MEDIA_TYPE?.trim().toLowerCase()
  return v === "print" ? "print" : "screen"
}

/**
 * Espera fuentes del documento y carga de imágenes antes de rasterizar a PDF.
 * Exportada para pruebas unitarias con `Page` mockeado.
 */
export async function waitForTechnicalSheetPdfDocumentAssets(page: Page): Promise<void> {
  await page.evaluate(async (imageWaitMs: number) => {
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
        const tid = window.setTimeout(done, imageWaitMs)
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
  }, PDF_IMAGE_WAIT_MS)
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

/**
 * Fidelity: `print` media para `@media print` de la plantilla, fuentes, imágenes, `page.pdf` Letter.
 * Exported for unit tests with a mocked `Page`.
 */
export async function applyTechnicalSheetPdfPipeline(
  page: Page,
  html: string,
  mediaType: "screen" | "print",
  pdfOverrides?: PDFOptions
): Promise<Buffer> {
  await page.emulateMediaType(mediaType)
  await page.setContent(html, { waitUntil: "load", timeout: 60_000 })
  await waitForTechnicalSheetPdfDocumentAssets(page)
  const buf = await page.pdf({
    ...getTechnicalSheetPdfPageOptions(),
    ...pdfOverrides,
  })
  return Buffer.from(buf)
}

export interface RenderHtmlToPdfBufferOptions {
  mediaType?: "screen" | "print"
  pdf?: PDFOptions
  viewport?: { width: number; height: number }
}

export async function renderHtmlToPdfBuffer(
  html: string,
  options?: RenderHtmlToPdfBufferOptions
): Promise<Buffer> {
  const executablePath = await resolveChromiumExecutablePathForPdf()
  const isVercel = isVercelRuntime()
  const args = isVercel ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"]

  let browser: Browser | undefined
  try {
    browser = await puppeteer.launch({
      // `chromium.args` already includes `--headless='shell'`; `headless: true` adds the new
      // headless stack and breaks launch on Vercel (see @sparticuz/chromium + puppeteer docs).
      headless: isVercel ? chromium.headless : true,
      executablePath,
      args,
      defaultViewport: isVercel ? chromium.defaultViewport : { width: 1280, height: 1600 },
      timeout: isVercel ? 120_000 : 30_000,
    })
    const page = await browser.newPage()
    try {
      if (options?.viewport) {
        await page.setViewport(options.viewport)
      }
      return await applyTechnicalSheetPdfPipeline(
        page,
        html,
        options?.mediaType ?? "print",
        options?.pdf
      )
    } finally {
      await page.close().catch(() => {})
    }
  } finally {
    await browser?.close().catch(() => {})
  }
}
