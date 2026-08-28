import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { AUTH_COOKIES } from "@/lib/auth"
import { PORTAL_SELECTION_PATH } from "@/lib/portal-access"
import { proxy } from "../../proxy"

function requestWithSession(
  path: string,
  role: string | null,
): NextRequest {
  const cookies = [`${AUTH_COOKIES.access}=token`]
  if (role) {
    cookies.push(
      `${AUTH_COOKIES.user}=${encodeURIComponent(JSON.stringify({ role }))}`,
    )
  }
  return new NextRequest(`https://dev-applicantree-ats.vercel.app${path}`, {
    headers: { cookie: cookies.join("; ") },
  })
}

function redirectPath(response: Response): string | null {
  const location = response.headers.get("location")
  if (!location) return null
  return new URL(location).pathname
}

describe("proxy portal selection", () => {
  it("redirige al candidato con un solo portal a su home", () => {
    const res = proxy(requestWithSession(PORTAL_SELECTION_PATH, "candidate"))
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(redirectPath(res)).toBe("/portal-candidato")
  })

  it("deja al reclutador en la selección porque tiene más de un portal", () => {
    const res = proxy(requestWithSession(PORTAL_SELECTION_PATH, "recruiter"))
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("location")).toBeNull()
  })

  it("deja al admin en la selección porque tiene más de un portal", () => {
    const res = proxy(requestWithSession(PORTAL_SELECTION_PATH, "admin"))
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("location")).toBeNull()
  })

  it("desde / manda al admin a la selección de portal", () => {
    const res = proxy(requestWithSession("/", "admin"))
    expect(redirectPath(res)).toBe(PORTAL_SELECTION_PATH)
  })
})
