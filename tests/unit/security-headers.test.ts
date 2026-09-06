import { describe, expect, it, afterEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  cspHeaderName,
  generateCspNonce,
  getStaticSecurityHeaders,
  isHstsEnabled,
  resolveCspMode,
} from "@/lib/security/security-headers"

describe("resolveCspMode", () => {
  afterEach(() => {
    delete process.env.CSP_MODE
  })

  it("defaults to enforce", () => {
    delete process.env.CSP_MODE
    expect(resolveCspMode()).toBe("enforce")
  })

  it("accepts report-only", () => {
    expect(resolveCspMode("report-only")).toBe("report-only")
    expect(resolveCspMode("REPORT-ONLY")).toBe("report-only")
  })
})

describe("isHstsEnabled", () => {
  it("is off by default", () => {
    expect(isHstsEnabled(undefined)).toBe(false)
    expect(isHstsEnabled("")).toBe(false)
  })

  it("opts in with 1 or true", () => {
    expect(isHstsEnabled("1")).toBe(true)
    expect(isHstsEnabled("true")).toBe(true)
  })
})

describe("buildContentSecurityPolicy", () => {
  it("includes nonce and strict-dynamic without unsafe-eval in production", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "testnonce",
      isDev: false,
      upgradeInsecureRequests: true,
    })
    expect(csp).toContain("'nonce-testnonce'")
    expect(csp).toContain("'strict-dynamic'")
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).toContain("upgrade-insecure-requests")
    expect(csp).toContain("https://flagcdn.com")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("report-uri /api/csp-report")
  })

  it("allows unsafe-eval only in development", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "devnonce",
      isDev: true,
      upgradeInsecureRequests: false,
    })
    expect(csp).toContain("'unsafe-eval'")
    expect(csp).not.toContain("upgrade-insecure-requests")
  })
})

describe("getStaticSecurityHeaders", () => {
  it("includes nosniff, referrer, frame deny, and COOP", () => {
    const keys = getStaticSecurityHeaders({ enableHsts: false }).map((h) => h.key)
    expect(keys).toContain("X-Content-Type-Options")
    expect(keys).toContain("Referrer-Policy")
    expect(keys).toContain("X-Frame-Options")
    expect(keys).toContain("Permissions-Policy")
    expect(keys).toContain("Cross-Origin-Opener-Policy")
    expect(keys).not.toContain("Strict-Transport-Security")
  })

  it("adds HSTS when enabled", () => {
    const keys = getStaticSecurityHeaders({ enableHsts: true }).map((h) => h.key)
    expect(keys).toContain("Strict-Transport-Security")
  })
})

describe("applySecurityHeaders", () => {
  it("sets enforce CSP and static headers on the response", () => {
    const request = new NextRequest("https://app.example.com/auth/iniciar-sesion")
    const response = NextResponse.next()
    const nonce = generateCspNonce()
    applySecurityHeaders(response, {
      request,
      nonce,
      mode: "enforce",
      isDev: false,
    })
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(response.headers.get("X-Frame-Options")).toBe("DENY")
    const csp = response.headers.get("Content-Security-Policy")
    expect(csp).toBeTruthy()
    expect(csp).toContain(`'nonce-${nonce}'`)
    expect(response.headers.get("Content-Security-Policy-Report-Only")).toBeNull()
  })

  it("uses Report-Only header when mode is report-only", () => {
    const request = new NextRequest("https://app.example.com/")
    const response = NextResponse.next()
    applySecurityHeaders(response, {
      request,
      nonce: "abc",
      mode: "report-only",
      isDev: false,
    })
    expect(cspHeaderName("report-only")).toBe(
      "Content-Security-Policy-Report-Only"
    )
    expect(response.headers.get("Content-Security-Policy-Report-Only")).toContain(
      "'nonce-abc'"
    )
    expect(response.headers.get("Content-Security-Policy")).toBeNull()
  })

  it("stamps nonce and CSP onto request headers for Next sealing", () => {
    const request = new NextRequest("https://app.example.com/")
    const requestHeaders = new Headers(request.headers)
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    applySecurityHeaders(response, {
      request,
      requestHeaders,
      nonce: "sealme",
      mode: "enforce",
      isDev: false,
    })
    expect(requestHeaders.get("x-nonce")).toBe("sealme")
    expect(requestHeaders.get("Content-Security-Policy")).toContain(
      "'nonce-sealme'"
    )
  })
})
