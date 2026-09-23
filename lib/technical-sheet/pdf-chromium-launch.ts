import chromium from "@sparticuz/chromium"
import type { LaunchOptions } from "puppeteer-core"
import { TECHNICAL_SHEET_PDF_LAUNCH_TIMEOUT_MS } from "@/lib/technical-sheet/pdf-chromium-limits"

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
}

const ENV_ALLOWLIST = [
  "PATH",
  "HOME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TMPDIR",
  "TEMP",
  "TMP",
  "FONTCONFIG_PATH",
  "FONTCONFIG_FILE",
  "XDG_CONFIG_HOME",
  "XDG_CACHE_HOME",
  "XDG_DATA_HOME",
  "XDG_RUNTIME_DIR",
  "LD_LIBRARY_PATH",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "DISPLAY",
] as const

/**
 * Env mínimo para Chromium: no hereda secretos/API keys de la app.
 */
export function buildPdfChromiumLaunchEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const key of ENV_ALLOWLIST) {
    const value = process.env[key]
    if (value != null && value !== "") env[key] = value
  }
  return env
}

/**
 * Args de Chromium.
 * En contenedores no-root (Cloud Run / Docker) `--no-sandbox` suele ser necesario;
 * el aislamiento de credenciales se logra con {@link buildPdfChromiumLaunchEnv} + red deny-by-default.
 */
export function resolvePdfChromiumLaunchArgs(): string[] {
  if (isVercelRuntime()) return [...chromium.args]
  return ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
}

export function resolvePdfChromiumHeadless(): LaunchOptions["headless"] {
  // @sparticuz/chromium >=143 embeds `--headless='shell'` in `args` and no longer
  // exports `chromium.headless`. Passing `headless: true` enables the new headless
  // stack and breaks launch on Vercel.
  if (isVercelRuntime()) return "shell"
  return true
}

export function resolvePdfChromiumDefaultViewport(): LaunchOptions["defaultViewport"] {
  // @sparticuz/chromium >=143 no longer exports `defaultViewport`.
  return { width: 1280, height: 1600, deviceScaleFactor: 1 }
}

export function preparePdfChromiumForLaunch(): void {
  if (isVercelRuntime()) {
    chromium.setGraphicsMode = false
  }
}

export function buildPdfChromiumLaunchOptions(executablePath: string): LaunchOptions {
  preparePdfChromiumForLaunch()
  return {
    // `chromium.args` already includes `--headless='shell'`; `headless: true` adds the new
    // headless stack and breaks launch on Vercel (see @sparticuz/chromium + puppeteer docs).
    headless: resolvePdfChromiumHeadless(),
    executablePath,
    args: resolvePdfChromiumLaunchArgs(),
    defaultViewport: resolvePdfChromiumDefaultViewport(),
    timeout: TECHNICAL_SHEET_PDF_LAUNCH_TIMEOUT_MS,
    env: buildPdfChromiumLaunchEnv(),
  }
}

export { isVercelRuntime as isPdfChromiumVercelRuntime }
