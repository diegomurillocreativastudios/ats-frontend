import { NextRequest } from "next/server"
import { afterEach, describe, expect, it } from "vitest"
import { MAINTENANCE_API_MESSAGE } from "@/lib/maintenance-mode"
import { PRIVATE_NO_STORE_CACHE_CONTROL } from "@/lib/security/cache-headers"
import { proxy } from "../../proxy"

const ORIGIN = "https://dev-applicantree-ats.vercel.app"

function requestFor(path: string, method = "GET"): NextRequest {
  return new NextRequest(`${ORIGIN}${path}`, { method })
}

describe("proxy maintenance mode", () => {
  afterEach(() => {
    delete process.env.MAINTENANCE_MODE
  })

  it("leaves the app alone when the flag is absent", () => {
    const res = proxy(requestFor("/auth/iniciar-sesion"))
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("location")).toBeNull()
  })

  it("does not treat other truthy values as on", () => {
    process.env.MAINTENANCE_MODE = "1"
    const res = proxy(requestFor("/auth/iniciar-sesion"))
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("location")).toBeNull()
  })

  it("redirects pages to /mantenimiento without copying the query", () => {
    process.env.MAINTENANCE_MODE = "true"
    const res = proxy(requestFor("/?from=/portal-rrhh"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe(`${ORIGIN}/mantenimiento`)
    expect(res.headers.get("Cache-Control")).toBe(PRIVATE_NO_STORE_CACHE_CONTROL)
  })

  it("redirects public pages with no-store so the 307 cannot stick", () => {
    process.env.MAINTENANCE_MODE = "true"
    const res = proxy(
      requestFor("/portal-oportunidades?from=/portal-rrhh/vacantes")
    )
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe(`${ORIGIN}/mantenimiento`)
    expect(res.headers.get("Cache-Control")).toBe(PRIVATE_NO_STORE_CACHE_CONTROL)
  })

  it("redirects a trailing slash on the maintenance path itself", () => {
    process.env.MAINTENANCE_MODE = "true"
    const res = proxy(requestFor("/mantenimiento/?next=/auth/iniciar-sesion"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe(`${ORIGIN}/mantenimiento`)
  })

  it("lets the maintenance page through", () => {
    process.env.MAINTENANCE_MODE = "true"
    const res = proxy(requestFor("/mantenimiento"))
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("location")).toBeNull()
    expect(res.headers.get("Cache-Control")).toBe(PRIVATE_NO_STORE_CACHE_CONTROL)
  })

  it("blocks the BFF and the CSP report with 503", async () => {
    process.env.MAINTENANCE_MODE = "true"

    for (const path of ["/api/bff/api/Vacancies", "/api/csp-report"]) {
      const res = proxy(requestFor(path, "POST"))
      expect(res.status).toBe(503)
      expect(res.headers.get("Retry-After")).toBe("3600")
      expect(res.headers.get("Cache-Control")).toBe(PRIVATE_NO_STORE_CACHE_CONTROL)
      await expect(res.json()).resolves.toEqual({
        message: MAINTENANCE_API_MESSAGE,
      })
    }
  })
})
