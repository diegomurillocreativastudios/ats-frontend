import { describe, expect, it } from "vitest"
import { NextResponse } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import { clearAuthSessionCookies } from "@/lib/auth/clear-auth-session-cookies"

describe("clearAuthSessionCookies", () => {
  it("expires access, refresh, expires, user and csrf cookies", () => {
    const response = NextResponse.json({ ok: true })
    clearAuthSessionCookies(response, { isProd: false })

    const joined = (response.headers.getSetCookie?.() ?? []).join("\n")
    for (const name of [
      AUTH_COOKIES.access,
      AUTH_COOKIES.refresh,
      AUTH_COOKIES.expires,
      AUTH_COOKIES.user,
      AUTH_COOKIES.csrf,
    ]) {
      expect(joined).toContain(`${name}=`)
    }
  })
})
