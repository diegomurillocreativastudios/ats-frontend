import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { proxy } from "../../proxy"

function requestFor(path: string): NextRequest {
  return new NextRequest(`https://dev-applicantree-ats.vercel.app${path}`)
}

describe("proxy legacy reset path", () => {
  it("redirige /restablecer-contrasena a /auth y conserva el token", () => {
    const res = proxy(requestFor("/restablecer-contrasena?token=abc"))
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    const location = res.headers.get("location")
    expect(location).toBeTruthy()
    const url = new URL(location!)
    expect(url.pathname).toBe("/auth/restablecer-contrasena")
    expect(url.searchParams.get("token")).toBe("abc")
  })
})

describe("proxy legacy forgot path", () => {
  it("redirige /auth/forgot-password a /auth/olvidaste-tu-contrasena", () => {
    const res = proxy(requestFor("/auth/forgot-password"))
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    const location = res.headers.get("location")
    expect(location).toBeTruthy()
    const url = new URL(location!)
    expect(url.pathname).toBe("/auth/olvidaste-tu-contrasena")
  })
})
