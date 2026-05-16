import { existsSync } from "node:fs"
import type { Browser } from "puppeteer-core"
import puppeteer from "puppeteer-core"
import chromium from "@sparticuz/chromium"

const LOCAL_CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
] as const

const REPORT_PDF_VIEWPORT = {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
} as const

const SET_CONTENT_TIMEOUT_MS = 30_000
const FONT_READY_TIMEOUT_MS = 2_000

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL)
}

function resolveLocalChromeExecutable(): string | null {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim()
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  for (const p of LOCAL_CHROME_CANDIDATES) {
    if (existsSync(p)) return p
  }
  return null
}

async function resolveExecutablePath(): Promise<string> {
  if (isVercelRuntime()) {
    return chromium.executablePath()
  }
  const local = resolveLocalChromeExecutable()
  if (local) return local
  throw new Error(
    "No browser found for PDF generation. Set PUPPETEER_EXECUTABLE_PATH to Chrome/Chromium, or install Google Chrome."
  )
}

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

/** Aborta CSS/imágenes/fuentes por red; el reporte ya lleva CSS inline en el HTML. */
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
 * Renderiza HTML completo del reporte RRHH a PDF (A4) con puppeteer-core + @sparticuz/chromium en Vercel.
 */
export async function renderReportViewPdfBuffer(fullHtml: string): Promise<Buffer> {
  const isVercel = isVercelRuntime()
  if (isVercel) {
    chromium.setGraphicsMode = false
  }

  const executablePath = await resolveExecutablePath()
  const launchArgs = isVercel ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"]

  let browser: Browser | undefined
  try {
    browser = await puppeteer.launch({
      args: launchArgs,
      executablePath,
      headless: true,
      ...(isVercel ? { defaultViewport: chromium.defaultViewport } : {}),
    })

    const page = await browser.newPage()
    try {
      await page.setViewport(REPORT_PDF_VIEWPORT)
      if (isVercel) {
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
