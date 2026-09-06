import { describe, expect, it, vi, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import { assertMutationCsrf } from "@/lib/auth/csrf"
import { proxy } from "../../proxy"

describe("proxy security headers (FE-SEC-010)", () => {
  afterEach(() => {
    delete process.env.CSP_MODE
  })

  it("adds defensive headers and CSP on NextResponse.next", () => {
    const req = new NextRequest(
      "https://dev-applicantree-ats.vercel.app/auth/iniciar-sesion"
    )
    const res = proxy(req)
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(res.headers.get("X-Frame-Options")).toBe("DENY")
    expect(res.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    )
    expect(res.headers.get("Cross-Origin-Opener-Policy")).toBe(
      "same-origin-allow-popups"
    )
    const csp = res.headers.get("Content-Security-Policy")
    expect(csp).toBeTruthy()
    expect(csp).toMatch(/'nonce-[^']+'/)
    expect(csp).toContain("'strict-dynamic'")
    expect(res.headers.get("Strict-Transport-Security")).toBeNull()
  })

  it("adds security headers on redirects", () => {
    const req = new NextRequest(
      "https://dev-applicantree-ats.vercel.app/iniciar-sesion"
    )
    const res = proxy(req)
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(res.headers.get("Content-Security-Policy")).toMatch(/'nonce-/)
  })

  it("uses Report-Only when CSP_MODE=report-only", () => {
    process.env.CSP_MODE = "report-only"
    const req = new NextRequest(
      "https://dev-applicantree-ats.vercel.app/auth/iniciar-sesion"
    )
    const res = proxy(req)
    expect(res.headers.get("Content-Security-Policy")).toBeNull()
    expect(res.headers.get("Content-Security-Policy-Report-Only")).toMatch(
      /'nonce-/
    )
  })

  it("adds security headers on CSRF rejection JSON", () => {
    const req = new NextRequest(
      "https://dev-applicantree-ats.vercel.app/api/auth/logout",
      {
        method: "POST",
        headers: {
          "sec-fetch-site": "cross-site",
          origin: "https://evil.example",
        },
      }
    )
    const res = proxy(req)
    expect(res.status).toBe(403)
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy()
  })
})

describe("CSP report CSRF exemption", () => {
  it("allows POST /api/csp-report without CSRF token", () => {
    const req = new NextRequest("https://app.example.com/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
    })
    expect(assertMutationCsrf(req).ok).toBe(true)
  })

  it("still requires CSRF on other API mutations", () => {
    const req = new NextRequest("https://app.example.com/api/auth/logout", {
      method: "POST",
      headers: {
        "sec-fetch-site": "same-origin",
        origin: "https://app.example.com",
        cookie: `${AUTH_COOKIES.csrf}=abc`,
      },
    })
    const result = assertMutationCsrf(req)
    expect(result.ok).toBe(false)
  })
})

describe("POST /api/csp-report", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns 204 and logs a sanitized summary", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    const { POST } = await import("@/app/api/csp-report/route")
    const req = new NextRequest("https://app.example.com/api/csp-report", {
      method: "POST",
      body: JSON.stringify({
        "csp-report": {
          "effective-directive": "script-src",
          "blocked-uri": "https://evil.example/x.js",
          "document-uri": "https://app.example.com/portal-rrhh",
          disposition: "enforce",
          "status-code": 200,
        },
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(204)
    expect(info).toHaveBeenCalledWith(
      "[csp-report]",
      expect.objectContaining({
        effectiveDirective: "script-src",
        blockedUri: "https://evil.example/x.js",
      })
    )
  })

  it("rejects oversized bodies", async () => {
    const { POST } = await import("@/app/api/csp-report/route")
    const req = new NextRequest("https://app.example.com/api/csp-report", {
      method: "POST",
      headers: { "content-length": "9000" },
      body: "x".repeat(100),
    })
    const res = await POST(req)
    expect(res.status).toBe(413)
  })
})
