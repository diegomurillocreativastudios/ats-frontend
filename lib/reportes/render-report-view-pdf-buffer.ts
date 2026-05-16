import type { Browser } from "puppeteer-core"
import { isVercelPdfRuntime, launchPdfBrowser } from "@/lib/pdf/launch-pdf-browser"

const REPORT_PDF_VIEWPORT = {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
} as const

const SET_CONTENT_TIMEOUT_MS = 30_000
const FONT_READY_TIMEOUT_MS = 2_000

async function waitForFontsReady(page: import("puppeteer-core").Page): Promise<void> {
  await page.evaluate(async (timeoutMs: number) => {
    if (!document.fonts?.ready) return
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, timeoutMs)
      }),
    ])
  }, FONT_READY_TIMEOUT_MS)
}

async function blockExternalNetworkResources(page: import("puppeteer-core").Page): Promise<void> {
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

/**
 * Renderiza HTML completo del reporte RRHH a PDF (A4).
 * Vercel: puppeteer-core + @sparticuz/chromium-min + /chromium-pack.tar
 * Local: puppeteer (Chrome incluido).
 */
export async function renderReportViewPdfBuffer(fullHtml: string): Promise<Buffer> {
  let browser: Browser | undefined
  try {
    browser = await launchPdfBrowser()
    const page = await browser.newPage()
    try {
      await page.setViewport(REPORT_PDF_VIEWPORT)
      if (isVercelPdfRuntime()) {
        await blockExternalNetworkResources(page)
      }

      await page.emulateMediaType("screen")
      await page.setContent(fullHtml, {
        waitUntil: "domcontentloaded",
        timeout: SET_CONTENT_TIMEOUT_MS,
      })

      await waitForFontsReady(page)

      const pdfUint8 = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      })
      return Buffer.from(pdfUint8)
    } finally {
      await page.close().catch(() => {})
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}
