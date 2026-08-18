import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { proxy } from "../../proxy"

function requestFor(path: string): NextRequest {
  return new NextRequest(`https://dev-applicantree-ats.vercel.app${path}`)
}

describe("proxy SSO success", () => {
  it("does not redirect the canonical success path", () => {
    const res = proxy(requestFor("/auth/sso/success"))
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("location")).toBeNull()
  })

  it("rewrites a trailing slash instead of 308 redirect", () => {
    const res = proxy(requestFor("/auth/sso/success/"))
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("location")).toBeNull()

    const rewrite = res.headers.get("x-middleware-rewrite") ?? ""
    expect(rewrite).toContain("/auth/sso/success")
    expect(new URL(rewrite).pathname).toBe("/auth/sso/success")
  })
})
