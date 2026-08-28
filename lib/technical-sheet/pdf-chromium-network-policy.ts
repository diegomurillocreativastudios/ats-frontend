import type { HTTPRequest, Page } from "puppeteer-core"
import { getPublicAppOrigin } from "@/lib/technical-sheet/server-public-app-url"

/**
 * Política de red deny-by-default para Chromium PDF.
 * Solo `data:`, `about:blank` y https del origen público de la app.
 */

const BLOCKED_HOST_SUFFIXES = [
  "metadata.google.internal",
  "metadata.google",
] as const

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "")
}

/**
 * Detecta hosts localhost, metadata GCP y rangos privados / link-local.
 */
export function isBlockedPdfChromiumHost(hostname: string): boolean {
  const h = normalizeHostname(hostname)
  if (!h) return true
  if (h === "localhost" || h === "metadata" || h === "::1" || h === "0.0.0.0") {
    return true
  }
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (h === suffix || h.endsWith(`.${suffix}`)) return true
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) {
    const parts = h.split(".").map((p) => Number(p))
    if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true
    const [a, b] = parts
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
  }

  // IPv6 link-local / unique-local / loopback (formas comunes)
  if (h === "0:0:0:0:0:0:0:1") return true
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true
  if (h.startsWith("::ffff:")) {
    const mapped = h.slice("::ffff:".length)
    if (isBlockedPdfChromiumHost(mapped)) return true
  }

  return false
}

function resolveAllowedAppOrigins(): Set<string> {
  const origins = new Set<string>()
  const publicOrigin = getPublicAppOrigin().trim()
  if (publicOrigin) {
    try {
      const u = new URL(publicOrigin)
      if (u.protocol === "https:" || u.protocol === "http:") {
        origins.add(`${u.protocol}//${u.host}`.toLowerCase())
      }
    } catch {
      /* ignore invalid origin */
    }
  }
  return origins
}

/**
 * Decide si Chromium puede continuar una request (deny-by-default).
 */
export function isPdfChromiumRequestAllowed(rawUrl: string): boolean {
  const url = String(rawUrl ?? "").trim()
  if (!url) return false

  const lower = url.toLowerCase()
  if (lower.startsWith("data:")) return true
  if (lower === "about:blank" || lower.startsWith("about:blank#")) return true
  if (lower.startsWith("blob:")) return true

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  const protocol = parsed.protocol.toLowerCase()
  if (protocol !== "https:" && protocol !== "http:") return false

  if (isBlockedPdfChromiumHost(parsed.hostname)) return false

  const allowed = resolveAllowedAppOrigins()
  if (allowed.size === 0) return false

  const origin = `${parsed.protocol}//${parsed.host}`.toLowerCase()
  return allowed.has(origin)
}

/**
 * Activa interceptación deny-by-default en la página Puppeteer.
 */
export async function applyPdfChromiumNetworkPolicy(page: Page): Promise<void> {
  await page.setRequestInterception(true)
  page.on("request", (request: HTTPRequest) => {
    const url = request.url()
    if (isPdfChromiumRequestAllowed(url)) {
      void request.continue().catch(() => {})
      return
    }
    void request.abort("blockedbyclient").catch(() => {})
  })
}
