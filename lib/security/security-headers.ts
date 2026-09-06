import type { NextRequest, NextResponse } from "next/server"

export const CSP_REPORT_PATH = "/api/csp-report"
export const NONCE_HEADER = "x-nonce"

export type CspMode = "enforce" | "report-only"

export interface BuildCspOptions {
  nonce: string
  isDev?: boolean
  upgradeInsecureRequests?: boolean
}

/**
 * Cryptographic nonce for per-request Content Security Policy (base64 UUID).
 */
export function generateCspNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64")
}

/**
 * Resolves CSP mode from CSP_MODE. Default is enforce; report-only is rollback.
 */
export function resolveCspMode(
  raw: string | undefined = process.env.CSP_MODE
): CspMode {
  const value = raw?.trim().toLowerCase()
  if (value === "report-only") return "report-only"
  return "enforce"
}

/**
 * Whether to emit Strict-Transport-Security (opt-in after HTTPS inventory).
 */
export function isHstsEnabled(
  raw: string | undefined = process.env.ENABLE_HSTS
): boolean {
  const value = raw?.trim().toLowerCase()
  return value === "1" || value === "true" || value === "yes"
}

/**
 * Static defensive headers (no Content Security Policy; CSP is per-request).
 */
export function getStaticSecurityHeaders(options?: {
  enableHsts?: boolean
}): Array<{ key: string; value: string }> {
  const headers: Array<{ key: string; value: string }> = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin-allow-popups",
    },
    {
      key: "Reporting-Endpoints",
      value: `csp-endpoint="${CSP_REPORT_PATH}"`,
    },
  ]

  if (options?.enableHsts ?? isHstsEnabled()) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    })
  }

  return headers
}

/**
 * Builds a nonce-based Content Security Policy for ApplicantTree.
 */
export function buildContentSecurityPolicy(options: BuildCspOptions): string {
  const isDev = options.isDev ?? process.env.NODE_ENV === "development"
  const scriptSrc = [
    "'self'",
    `'nonce-${options.nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(" ")

  const directives = [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://flagcdn.com",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    `report-uri ${CSP_REPORT_PATH}`,
    "report-to csp-endpoint",
  ]

  if (options.upgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests")
  }

  return directives.join("; ").replace(/\s{2,}/g, " ").trim()
}

/**
 * Content Security Policy header name for the active mode.
 */
export function cspHeaderName(mode: CspMode = resolveCspMode()): string {
  return mode === "report-only"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy"
}

/**
 * Applies static security headers plus per-request CSP to a response.
 * When `requestHeaders` is provided (for NextResponse.next), also stamps
 * x-nonce and the enforcing CSP onto the request so Next can seal scripts.
 */
export function applySecurityHeaders(
  response: NextResponse,
  options?: {
    request?: NextRequest
    requestHeaders?: Headers
    nonce?: string
    mode?: CspMode
    isDev?: boolean
  }
): NextResponse {
  const nonce = options?.nonce ?? generateCspNonce()
  const mode = options?.mode ?? resolveCspMode()
  const isHttps =
    options?.request?.nextUrl.protocol === "https:" ||
    options?.request?.headers.get("x-forwarded-proto") === "https"

  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: options?.isDev,
    upgradeInsecureRequests: isHttps,
  })
  const headerName = cspHeaderName(mode)

  for (const { key, value } of getStaticSecurityHeaders()) {
    response.headers.set(key, value)
  }
  response.headers.set(headerName, csp)

  if (options?.requestHeaders) {
    options.requestHeaders.set(NONCE_HEADER, nonce)
    // Next extracts the nonce from the request Content-Security-Policy header.
    options.requestHeaders.set("Content-Security-Policy", csp)
  }

  return response
}
