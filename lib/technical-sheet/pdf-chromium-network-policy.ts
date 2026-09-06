import { BlockList, isIP } from "node:net"
import type { HTTPRequest, Page } from "puppeteer-core"
import { getPublicAppOrigin } from "@/lib/technical-sheet/server-public-app-url"

/**
 * Política de red deny-by-default para Chromium PDF.
 * Solo `data:`, `about:blank`, `blob:` y http(s) del origen público de la app.
 * Hosts/IPs se clasifican con `URL` + `node:net` (sin regex).
 */

const BLOCKED_HOST_SUFFIXES = [
  "metadata.google.internal",
  "metadata.google",
] as const

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata", "0.0.0.0"])

const PRIVATE_NETWORK = createPrivateNetworkBlockList()

function createPrivateNetworkBlockList(): BlockList {
  const list = new BlockList()
  // IPv4: this / unspecified / loopback / RFC1918 / link-local / CGNAT
  list.addSubnet("0.0.0.0", 8, "ipv4")
  list.addSubnet("10.0.0.0", 8, "ipv4")
  list.addSubnet("127.0.0.0", 8, "ipv4")
  list.addSubnet("169.254.0.0", 16, "ipv4")
  list.addSubnet("172.16.0.0", 12, "ipv4")
  list.addSubnet("192.168.0.0", 16, "ipv4")
  list.addSubnet("100.64.0.0", 10, "ipv4")
  // IPv6: loopback / link-local / unique-local
  list.addAddress("::1", "ipv6")
  list.addSubnet("fe80::", 10, "ipv6")
  list.addSubnet("fc00::", 7, "ipv6")
  return list
}

function normalizeHostname(hostname: string): string {
  const trimmed = hostname.trim().toLowerCase()
  if (!trimmed) return ""
  // URL.hostname may wrap IPv6 in brackets; strip trailing DNS root dot.
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1)
  }
  if (trimmed.endsWith(".")) return trimmed.slice(0, -1)
  return trimmed
}

function isBlockedMetadataHost(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.has(hostname)) return true
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (hostname === suffix || hostname.endsWith(`.${suffix}`)) return true
  }
  return false
}

function isBlockedIpLiteral(address: string): boolean {
  const version = isIP(address)
  if (version === 0) return false

  if (version === 4) {
    return PRIVATE_NETWORK.check(address, "ipv4")
  }

  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — evaluate the embedded IPv4.
  const mappedPrefix = "::ffff:"
  if (address.startsWith(mappedPrefix)) {
    const embedded = address.slice(mappedPrefix.length)
    if (isIP(embedded) === 4) return isBlockedIpLiteral(embedded)
  }

  return PRIVATE_NETWORK.check(address, "ipv6")
}

/**
 * Detecta hosts localhost, metadata GCP y rangos privados / link-local.
 */
export function isBlockedPdfChromiumHost(hostname: string): boolean {
  const h = normalizeHostname(hostname)
  if (!h) return true
  if (isBlockedMetadataHost(h)) return true
  if (isBlockedIpLiteral(h)) return true
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
