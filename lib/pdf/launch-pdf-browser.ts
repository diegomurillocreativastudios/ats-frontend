import type { Browser, LaunchOptions } from "puppeteer-core"

/**
 * Chromium empaquetado para Vercel serverless (@sparticuz/chromium-min + chromium-pack.tar).
 * En local usa `puppeteer` (Chrome incluido).
 *
 * Fluid Compute: si aparece libnss3.so u otras libs faltantes, probá desactivar Fluid Compute
 * en el proyecto Vercel (hay reportes de incompatibilidad con binarios de Chromium).
 */

let cachedExecutablePath: string | null = null
let downloadPromise: Promise<string> | null = null

export function isVercelPdfRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL)
}

function withHttpsOrigin(raw: string): string {
  const trimmed = raw.replace(/\/$/, "")
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/\//, "")}`
}

/**
 * URL pública del tar generado en `public/chromium-pack.tar`.
 * Prioridad: CHROMIUM_PACK_URL → VERCEL_URL → NEXT_PUBLIC_APP_URL.
 */
export function resolveChromiumPackUrl(): string {
  const explicit = process.env.CHROMIUM_PACK_URL?.trim()
  if (explicit) return explicit

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//, "")
    return `https://${host}/chromium-pack.tar`
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl) {
    return `${withHttpsOrigin(appUrl)}/chromium-pack.tar`
  }

  throw new Error(
    "CHROMIUM_PACK_URL no configurada. Ejemplo: https://tu-app.vercel.app/chromium-pack.tar"
  )
}

async function getVercelChromiumExecutablePath(): Promise<string> {
  if (cachedExecutablePath) return cachedExecutablePath

  if (!downloadPromise) {
    const chromium = await import("@sparticuz/chromium-min")
    const packUrl = resolveChromiumPackUrl()
    chromium.default.setGraphicsMode = false

    downloadPromise = chromium.default
      .executablePath(packUrl)
      .then((path) => {
        cachedExecutablePath = path
        console.log("[pdf-chromium] executablePath", path, "pack", packUrl)
        return path
      })
      .catch((error: unknown) => {
        downloadPromise = null
        throw error
      })
  }

  return downloadPromise
}

export async function getPdfChromiumLaunchArgs(): Promise<string[]> {
  if (!isVercelPdfRuntime()) {
    return ["--no-sandbox", "--disable-setuid-sandbox"]
  }
  const chromium = await import("@sparticuz/chromium-min")
  return chromium.default.args
}

export async function launchPdfBrowser(
  options?: Pick<LaunchOptions, "defaultViewport" | "timeout">
): Promise<Browser> {
  if (!isVercelPdfRuntime()) {
    const puppeteer = await import("puppeteer")
    return puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ...options,
    })
  }

  const puppeteerCore = await import("puppeteer-core")
  const chromium = await import("@sparticuz/chromium-min")
  const executablePath = await getVercelChromiumExecutablePath()

  return puppeteerCore.default.launch({
    args: chromium.default.args,
    executablePath,
    headless: true,
    defaultViewport: options?.defaultViewport ?? chromium.default.defaultViewport,
    timeout: options?.timeout ?? 120_000,
  })
}
