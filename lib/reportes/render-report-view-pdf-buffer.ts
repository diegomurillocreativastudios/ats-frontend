import type { Browser } from "puppeteer-core"
import { createPdfDebugLogger, timedStep } from "@/lib/pdf/pdf-debug-log"
import { isVercelPdfRuntime, launchPdfBrowser } from "@/lib/pdf/launch-pdf-browser"

const REPORT_PDF_VIEWPORT = {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
} as const

const PAGE_TIMEOUT_MS = 15_000
const SET_CONTENT_TIMEOUT_MS = 15_000
const FONT_READY_TIMEOUT_MS = 2_000
const PDF_GENERATE_TIMEOUT_MS = 20_000

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

async function blockHeavyNetworkResources(page: import("puppeteer-core").Page): Promise<void> {
  await page.setRequestInterception(true)
  page.on("request", (request) => {
    const url = request.url()
    if (url === "about:blank" || url.startsWith("data:")) {
      void request.continue()
      return
    }
    const type = request.resourceType()
    if (["image", "media", "font"].includes(type)) {
      void request.abort()
      return
    }
    void request.continue()
  })
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} excedió ${ms}ms`))
    }, ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error: unknown) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

/**
 * Renderiza HTML completo del reporte RRHH a PDF (A4).
 * Vercel: puppeteer-core + @sparticuz/chromium-min + /chromium-pack.tar
 * Local: puppeteer (Chrome incluido).
 */
export async function renderReportViewPdfBuffer(fullHtml: string): Promise<Buffer> {
  const log = createPdfDebugLogger("render")
  let browser: Browser | undefined

  try {
    browser = await launchPdfBrowser()
    const page = await browser.newPage()
    try {
      page.setDefaultTimeout(PAGE_TIMEOUT_MS)
      page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS)

      await page.setViewport(REPORT_PDF_VIEWPORT)

      if (isVercelPdfRuntime()) {
        await blockHeavyNetworkResources(page)
      }

      await page.emulateMediaType("screen")

      await timedStep("page.setContent", async () => {
        log("page.setContent: antes", { htmlChars: fullHtml.length })
        await page.setContent(fullHtml, {
          waitUntil: "domcontentloaded",
          timeout: SET_CONTENT_TIMEOUT_MS,
        })
        log("page.setContent: después")
      })

      await waitForFontsReady(page)

      const pdfUint8 = await timedStep("page.pdf", () =>
        withTimeout(
          page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
          }),
          PDF_GENERATE_TIMEOUT_MS,
          "page.pdf"
        )
      )

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
