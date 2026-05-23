import type { Browser, Page, PaperFormat } from "puppeteer-core"
import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium"
import { resolveChromiumExecutablePathForPdf } from "@/lib/technical-sheet/html-to-pdf-chromium"

/**
 * Chromium pipeline para reportes (separado del de ficha técnica para no
 * romper su test de `waitUntil: "load"`). Usa `setContent(load)` seguido de
 * `waitForNetworkIdle` para emular el comportamiento de `networkidle0` (no
 * disponible en `setContent` de `puppeteer-core` v24) y `emulateMediaType("print")`
 * para que `@media print` y `@page` de la plantilla se apliquen 1:1.
 */

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
}

const REPORT_PDF_PAGE_OPTIONS = {
  format: "Letter" as PaperFormat,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
} as const

export function getReportPdfPageOptions(): typeof REPORT_PDF_PAGE_OPTIONS {
  return { ...REPORT_PDF_PAGE_OPTIONS, margin: { ...REPORT_PDF_PAGE_OPTIONS.margin } }
}

export function resolveSetContentTimeoutMsForReport(html: string): number {
  const len = html.length
  if (len > 400_000) return 180_000
  if (len > 150_000) return 120_000
  return 60_000
}

const PDF_IMAGE_WAIT_MS = 15_000

/** Exportada para tests unitarios con `Page` mockeado. */
export async function waitForReportPdfDocumentAssets(page: Page): Promise<void> {
  await page.evaluate(async (imageWaitMs: number) => {
    if (document.fonts?.ready) await document.fonts.ready

    const imgs = Array.from(document.images)
    await Promise.all(
      imgs.map(
        (img) =>
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
      )
    )

    await Promise.all(
      imgs.map(async (img) => {
        try {
          if (typeof img.decode === "function") await img.decode()
        } catch {
          /* decode opcional; el PDF sigue */
        }
      })
    )
  }, PDF_IMAGE_WAIT_MS)
}

/**
 * Pipeline puro (sin lanzar Chromium): emulateMediaType -> setContent (networkidle0)
 * -> esperar assets -> page.pdf(Letter, 0 margin, preferCSSPageSize, printBackground).
 *
 * Separado del de ficha técnica para no romper sus pruebas; cualquier ajuste a
 * reportes no debe tocar `applyTechnicalSheetPdfPipeline`.
 */
export async function applyReportPdfPipeline(
  page: Page,
  html: string
): Promise<Buffer> {
  await page.emulateMediaType("print")
  await page.setContent(html, {
    waitUntil: "load",
    timeout: resolveSetContentTimeoutMsForReport(html),
  })
  // Equivalente a `waitUntil: networkidle0` (no permitido para setContent en
  // puppeteer-core v24). Si el HTML no genera tráfico, este wait resuelve casi
  // instantáneamente.
  try {
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30_000 })
  } catch {
    /* HTML autocontenido: no hubo red para esperar; seguimos. */
  }
  await waitForReportPdfDocumentAssets(page)
  const buf = await page.pdf(getReportPdfPageOptions())
  return Buffer.from(buf)
}

/** Lanza Chromium, ejecuta el pipeline y cierra el browser de forma segura. */
export async function renderReportHtmlToPdfBuffer(html: string): Promise<Buffer> {
  const executablePath = await resolveChromiumExecutablePathForPdf()
  const isVercel = isVercelRuntime()
  if (isVercel) {
    chromium.setGraphicsMode = false
  }
  const args = isVercel
    ? chromium.args
    : ["--no-sandbox", "--disable-setuid-sandbox"]

  let browser: Browser | undefined
  try {
    browser = await puppeteer.launch({
      headless: isVercel ? chromium.headless : true,
      executablePath,
      args,
      defaultViewport: isVercel
        ? chromium.defaultViewport
        : { width: 1280, height: 1600 },
      timeout: isVercel ? 120_000 : 30_000,
    })
    const page = await browser.newPage()
    try {
      return await applyReportPdfPipeline(page, html)
    } finally {
      await page.close().catch(() => {})
    }
  } finally {
    await browser?.close().catch(() => {})
  }
}
