import { existsSync } from "node:fs"
import type { Browser, Page } from "puppeteer-core"
import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium"
import { withTechnicalSheetPdfSlot } from "@/lib/technical-sheet/pdf-chromium-concurrency"
import {
  TECHNICAL_SHEET_PDF_IMAGE_WAIT_MS,
  TECHNICAL_SHEET_PDF_MAX_IMAGES,
  TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS,
} from "@/lib/technical-sheet/pdf-chromium-limits"
import { buildPdfChromiumLaunchOptions } from "@/lib/technical-sheet/pdf-chromium-launch"
import { applyPdfChromiumNetworkPolicy } from "@/lib/technical-sheet/pdf-chromium-network-policy"

/**
 * Entorno PDF headless:
 * - `VERCEL` / `VERCEL_ENV`: Chromium binary from `@sparticuz/chromium`.
 * - `PUPPETEER_EXECUTABLE_PATH`: Chrome/Chromium locally o en Docker (GCP).
 * - `TECHNICAL_SHEET_PDF_MEDIA_TYPE`: solo afecta pruebas o llamadas directas a `applyTechnicalSheetPdfPipeline`;
 *   `renderHtmlToPdfBuffer` usa siempre `print` para aplicar `@media print` de la plantilla.
 *
 * Hardening: red deny-by-default, env mínimo, semáforo de concurrencia, timeouts acotados.
 */

const LOCAL_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
] as const

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
  await page.evaluate(
    async (opts: { imageWaitMs: number; maxImages: number }) => {
      if (document.fonts?.ready) await document.fonts.ready

      const imgs = Array.from(document.images).slice(0, opts.maxImages)
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
          const tid = window.setTimeout(done, opts.imageWaitMs)
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
    },
    {
      imageWaitMs: TECHNICAL_SHEET_PDF_IMAGE_WAIT_MS,
      maxImages: TECHNICAL_SHEET_PDF_MAX_IMAGES,
    }
  )
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
 * Timeout fijo de `setContent` (presupuesto acotado; no escala con el HTML).
 * El argumento `html` se conserva por compatibilidad de API/tests.
 */
export function resolveSetContentTimeoutMs(_html?: string): number {
  return TECHNICAL_SHEET_PDF_SET_CONTENT_TIMEOUT_MS
}

/**
 * Fidelity: `print` media para `@media print` de la plantilla, fuentes, imágenes, `page.pdf` Letter.
 * Aplica política de red deny-by-default antes de cargar HTML.
 * Exported for unit tests with a mocked `Page`.
 */
export async function applyTechnicalSheetPdfPipeline(
  page: Page,
  html: string,
  mediaType: "screen" | "print"
): Promise<Buffer> {
  await applyPdfChromiumNetworkPolicy(page)
  await page.emulateMediaType(mediaType)
  await page.setContent(html, {
    waitUntil: "load",
    timeout: resolveSetContentTimeoutMs(html),
  })
  await waitForTechnicalSheetPdfDocumentAssets(page)
  const buf = await page.pdf(getTechnicalSheetPdfPageOptions())
  return Buffer.from(buf)
}

export interface RenderHtmlToPdfBufferOptions {
  /** Vista previa del panel usa estilos `screen`; GET servidor usa `print`. */
  mediaType?: "screen" | "print"
  /** Si true, el caller ya reservó el slot de concurrencia. */
  skipConcurrencySlot?: boolean
}

async function renderHtmlToPdfBufferUnlocked(
  html: string,
  options?: RenderHtmlToPdfBufferOptions
): Promise<Buffer> {
  const executablePath = await resolveChromiumExecutablePathForPdf()
  const launchOptions = buildPdfChromiumLaunchOptions(executablePath)

  let browser: Browser | undefined
  try {
    browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()
    try {
      return await applyTechnicalSheetPdfPipeline(page, html, options?.mediaType ?? "print")
    } finally {
      await page.close().catch(() => {})
    }
  } finally {
    await browser?.close().catch(() => {})
  }
}

export async function renderHtmlToPdfBuffer(
  html: string,
  options?: RenderHtmlToPdfBufferOptions
): Promise<Buffer> {
  if (options?.skipConcurrencySlot) {
    return renderHtmlToPdfBufferUnlocked(html, options)
  }
  return withTechnicalSheetPdfSlot(() => renderHtmlToPdfBufferUnlocked(html, options))
}
