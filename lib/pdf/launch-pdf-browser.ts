import type { Browser, LaunchOptions } from "puppeteer-core"
import { createPdfDebugLogger, timedStep } from "@/lib/pdf/pdf-debug-log"
import { validateChromiumPackUrl } from "@/lib/pdf/validate-chromium-pack"

/**
 * Chromium empaquetado para Vercel serverless (@sparticuz/chromium-min + chromium-pack.tar).
 * En local usa `puppeteer` (Chrome incluido).
 *
 * Fluid Compute: si aparece libnss3.so u otras libs faltantes, probá desactivar Fluid Compute
 * en el proyecto Vercel (hay reportes de incompatibilidad con binarios de Chromium).
 */

const EXECUTABLE_PATH_TIMEOUT_MS = 45_000
const LAUNCH_TIMEOUT_MS = 20_000

let cachedExecutablePath: string | null = null
let executablePathPromise: Promise<string> | null = null
let packValidated = false

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

async function getCachedExecutablePath(
  chromiumPackUrl: string,
  log: ReturnType<typeof createPdfDebugLogger>
): Promise<string> {
  if (cachedExecutablePath) {
    log("chromium.executablePath: cache hit (memoria)")
    return cachedExecutablePath
  }

  if (!executablePathPromise) {
    executablePathPromise = timedStep("chromium.executablePath", async () => {
      log("chromium.executablePath: inicio (descarga/extracción del .tar)")
      const chromium = await import("@sparticuz/chromium-min")
      chromium.default.setGraphicsMode = false

      const path = await withTimeout(
        chromium.default.executablePath(chromiumPackUrl),
        EXECUTABLE_PATH_TIMEOUT_MS,
        "chromium.executablePath"
      )
      cachedExecutablePath = path
      log("chromium.executablePath: listo", { path })
      return path
    }).catch((error: unknown) => {
      executablePathPromise = null
      throw error
    })
  }

  return executablePathPromise
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
  const log = createPdfDebugLogger("chromium")
  const isVercel = isVercelPdfRuntime()
  log("launchPdfBrowser: inicio", { isVercel })

  if (!isVercel) {
    return timedStep("puppeteer.launch (local)", async () => {
      const puppeteer = await import(/* webpackIgnore: true */ "puppeteer")
      return puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ...options,
      })
    })
  }

  const chromiumPackUrl = resolveChromiumPackUrl()
  log("resolveChromiumPackUrl", { chromiumPackUrl })

  if (!packValidated) {
    await validateChromiumPackUrl(chromiumPackUrl, (step, extra) => log(step, extra))
    packValidated = true
  } else {
    log("validateChromiumPack: skip (instancia caliente)")
  }

  const executablePath = await getCachedExecutablePath(chromiumPackUrl, log)

  const puppeteerCore = await import("puppeteer-core")
  const chromium = await import("@sparticuz/chromium-min")

  return timedStep("puppeteer.launch", async () => {
    log("puppeteer.launch: antes")
    const browser = await puppeteerCore.default.launch({
      args: chromium.default.args,
      executablePath,
      headless: true,
      defaultViewport: options?.defaultViewport ?? chromium.default.defaultViewport,
      timeout: options?.timeout ?? LAUNCH_TIMEOUT_MS,
    })
    log("puppeteer.launch: después")
    return browser
  })
}
