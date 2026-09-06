import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { AUTH_COOKIES } from "@/lib/auth"
import { PORTAL_SELECTION_PATH } from "@/lib/portal-access"
import { proxy } from "../../proxy"

function requestWithToken(
  path: string,
  roleInCookie: string | null = null
): NextRequest {
  const cookies = [`${AUTH_COOKIES.access}=token`]
  if (roleInCookie) {
    cookies.push(
      `${AUTH_COOKIES.user}=${encodeURIComponent(
        JSON.stringify({ role: roleInCookie })
      )}`
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

describe("proxy portal selection (no role from ats_user)", () => {
  it("sends authenticated / to portal selection regardless of cookie role", () => {
    const res = proxy(requestWithToken("/", "candidate"))
    expect(redirectPath(res)).toBe(PORTAL_SELECTION_PATH)
  })

  it("sends authenticated auth pages to portal selection", () => {
    const res = proxy(requestWithToken("/auth/iniciar-sesion", "admin"))
    expect(redirectPath(res)).toBe(PORTAL_SELECTION_PATH)
  })

  it("does not redirect portal selection by cookie role", () => {
    const res = proxy(requestWithToken(PORTAL_SELECTION_PATH, "candidate"))
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("location")).toBeNull()
  })

  it("does not cross-redirect candidate and recruiter portals by cookie", () => {
    const asRecruiterOnCandidate = proxy(
      requestWithToken("/portal-candidato", "recruiter")
    )
    expect(asRecruiterOnCandidate.status).toBeLessThan(300)
    expect(asRecruiterOnCandidate.headers.get("location")).toBeNull()

    const asCandidateOnRrhh = proxy(
      requestWithToken("/portal-rrhh", "candidate")
    )
    expect(asCandidateOnRrhh.status).toBeLessThan(300)
    expect(asCandidateOnRrhh.headers.get("location")).toBeNull()
  })
})
