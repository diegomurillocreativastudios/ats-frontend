import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import {
  PRIVATE_NO_STORE_CACHE_CONTROL,
  applyPrivateNoStore,
  shouldApplyPrivateNoStore,
} from "@/lib/security/cache-headers"
import { applySecurityHeaders } from "@/lib/security/security-headers"
import { proxy } from "../../proxy"

const ROOT = join(__dirname, "../..")

/**
 * Walk source files under a directory (non-node_modules).
 */
function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      walkSourceFiles(full, acc)
      continue
    }
    if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) acc.push(full)
  }
  return acc
}

/**
 * FE-SEC-024: private no-store for session / PII / PDF / private HTML.
 * Hashed static assets stay outside the proxy matcher (public, immutable).
 */
describe("FE-SEC-024 cache control", () => {
  it("exports the canonical private, no-store value", () => {
    expect(PRIVATE_NO_STORE_CACHE_CONTROL).toBe("private, no-store")
  })

  it("applies to API, auth pages, portal selection, and private portals", () => {
    expect(shouldApplyPrivateNoStore("/api/auth/me")).toBe(true)
    expect(shouldApplyPrivateNoStore("/api/bff/api/Vacancies")).toBe(true)
    expect(shouldApplyPrivateNoStore("/auth/iniciar-sesion")).toBe(true)
    expect(shouldApplyPrivateNoStore("/seleccion-portal")).toBe(true)
    expect(shouldApplyPrivateNoStore("/portal-rrhh/vacantes")).toBe(true)
    expect(shouldApplyPrivateNoStore("/portal-candidato/mi-perfil")).toBe(true)
    expect(shouldApplyPrivateNoStore("/portal-admin/administracion/usuarios")).toBe(
      true
    )
  })

  it("does not apply to public marketing pages or Next static assets", () => {
    expect(shouldApplyPrivateNoStore("/portal-oportunidades")).toBe(false)
    expect(shouldApplyPrivateNoStore("/portal-oportunidades/foo")).toBe(false)
    expect(shouldApplyPrivateNoStore("/privacy-policy")).toBe(false)
    expect(shouldApplyPrivateNoStore("/_next/static/chunks/main.js")).toBe(false)
    expect(shouldApplyPrivateNoStore("/")).toBe(false)
  })

  it("stamps Cache-Control on NextResponse via applyPrivateNoStore", () => {
    const response = applyPrivateNoStore(NextResponse.json({ ok: true }))
    expect(response.headers.get("Cache-Control")).toBe(
      PRIVATE_NO_STORE_CACHE_CONTROL
    )
  })

  it("stamps private, no-store via applySecurityHeaders for private paths", () => {
    const request = new NextRequest(
      "https://app.example.com/portal-rrhh/vacantes"
    )
    const response = NextResponse.next()
    applySecurityHeaders(response, {
      request,
      nonce: "testnonce",
      mode: "enforce",
      isDev: false,
    })
    expect(response.headers.get("Cache-Control")).toBe(
      PRIVATE_NO_STORE_CACHE_CONTROL
    )
  })

  it("does not stamp Cache-Control via applySecurityHeaders for public opportunities", () => {
    const request = new NextRequest(
      "https://app.example.com/portal-oportunidades"
    )
    const response = NextResponse.next()
    applySecurityHeaders(response, {
      request,
      nonce: "testnonce",
      mode: "enforce",
      isDev: false,
    })
    expect(response.headers.get("Cache-Control")).toBeNull()
  })

  it("proxy stamps private, no-store on private portal navigation", () => {
    const req = new NextRequest(
      "https://dev-applicantree-ats.vercel.app/portal-rrhh",
      {
        headers: {
          cookie: "ats_access_token=test-token",
        },
      }
    )
    const res = proxy(req)
    expect(res.headers.get("Cache-Control")).toBe(PRIVATE_NO_STORE_CACHE_CONTROL)
  })

  it("proxy does not stamp private, no-store on public opportunities", () => {
    const req = new NextRequest(
      "https://dev-applicantree-ats.vercel.app/portal-oportunidades"
    )
    const res = proxy(req)
    expect(res.headers.get("Cache-Control")).toBeNull()
  })

  it("does not introduce shared Next data cache primitives", () => {
    const files = [
      ...walkSourceFiles(join(ROOT, "app")),
      ...walkSourceFiles(join(ROOT, "lib")),
      ...walkSourceFiles(join(ROOT, "components")),
    ]
    const offenders: string[] = []
    for (const file of files) {
      const src = readFileSync(file, "utf8")
      if (
        /\bunstable_cache\b/.test(src) ||
        /['"]use cache['"]/.test(src) ||
        /\bcacheLife\b/.test(src) ||
        /\bcacheTag\b/.test(src)
      ) {
        offenders.push(file.replace(ROOT + "/", ""))
      }
    }
    expect(offenders).toEqual([])
  })

  it("PDF handlers emit private, no-store (not bare no-store)", () => {
    const reportPdf = readFileSync(
      join(ROOT, "lib/reportes/handle-report-pdf-post.ts"),
      "utf8"
    )
    const sheetPdf = readFileSync(
      join(
        ROOT,
        "app/api/recruiter/vacancies/[vacancyId]/candidates/[candidateProfileId]/technical-sheet/pdf/route.ts"
      ),
      "utf8"
    )
    expect(reportPdf).toContain("PRIVATE_NO_STORE_CACHE_CONTROL")
    expect(sheetPdf).toContain("PRIVATE_NO_STORE_CACHE_CONTROL")
    expect(reportPdf).not.toMatch(/"Cache-Control":\s*"no-store"/)
    expect(sheetPdf).not.toMatch(/"Cache-Control":\s*"no-store"/)
  })
})
