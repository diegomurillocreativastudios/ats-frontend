import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import {
  assertMutationCsrf,
  csrfTokensEqual,
  generateCsrfToken,
} from "@/lib/auth/csrf"
import { AUTH_COOKIES } from "@/lib/auth"
import { buildBackendPathFromSegments } from "@/lib/api/bff-path"
import { proxy } from "../../proxy"

describe("csrfTokensEqual", () => {
  it("matches equal tokens", () => {
    const token = generateCsrfToken()
    expect(csrfTokensEqual(token, token)).toBe(true)
  })

  it("rejects unequal or empty tokens", () => {
    expect(csrfTokensEqual("abc", "xyz")).toBe(false)
    expect(csrfTokensEqual("", "abc")).toBe(false)
    expect(csrfTokensEqual("abc", "")).toBe(false)
  })
})

describe("assertMutationCsrf", () => {
  const token = "a".repeat(64)

  function mutationRequest(
    path: string,
    init: {
      method?: string
      origin?: string
      secFetchSite?: string
      csrfHeader?: string
      csrfCookie?: string
    } = {}
  ) {
    const headers = new Headers()
    if (init.origin) headers.set("origin", init.origin)
    if (init.secFetchSite) headers.set("sec-fetch-site", init.secFetchSite)
    if (init.csrfHeader) headers.set("x-csrf-token", init.csrfHeader)
    const cookieParts: string[] = []
    if (init.csrfCookie) {
      cookieParts.push(`${AUTH_COOKIES.csrf}=${init.csrfCookie}`)
    }
    if (cookieParts.length) headers.set("cookie", cookieParts.join("; "))
    return new NextRequest(`https://app.example.com${path}`, {
      method: init.method ?? "POST",
      headers,
    })
  }

  it("allows safe methods without CSRF", () => {
    const req = mutationRequest("/api/auth/me", { method: "GET" })
    expect(assertMutationCsrf(req).ok).toBe(true)
  })

  it("rejects cross-site Fetch Metadata", () => {
    const req = mutationRequest("/api/auth/logout", {
      secFetchSite: "cross-site",
      origin: "https://evil.example",
      csrfHeader: token,
      csrfCookie: token,
    })
    const result = assertMutationCsrf(req)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(403)
  })

  it("rejects missing CSRF token", () => {
    const req = mutationRequest("/api/auth/login", {
      secFetchSite: "same-origin",
      origin: "https://app.example.com",
    })
    const result = assertMutationCsrf(req)
    expect(result.ok).toBe(false)
  })

  it("accepts matching double-submit token on same-origin", () => {
    const req = mutationRequest("/api/auth/login", {
      secFetchSite: "same-origin",
      origin: "https://app.example.com",
      csrfHeader: token,
      csrfCookie: token,
    })
    expect(assertMutationCsrf(req).ok).toBe(true)
  })

  it("rejects disallowed origin when Sec-Fetch-Site is absent", () => {
    const req = mutationRequest("/api/bff/api/Templates", {
      origin: "https://evil.example",
      csrfHeader: token,
      csrfCookie: token,
    })
    const result = assertMutationCsrf(req)
    expect(result.ok).toBe(false)
  })
})

describe("buildBackendPathFromSegments", () => {
  it("joins segments into a backend path", () => {
    expect(buildBackendPathFromSegments(["api", "Templates"])).toBe(
      "/api/Templates"
    )
  })

  it("rejects traversal and empty segments", () => {
    expect(buildBackendPathFromSegments(["..", "api"])).toBeNull()
    expect(buildBackendPathFromSegments([])).toBeNull()
    expect(buildBackendPathFromSegments(undefined)).toBeNull()
  })
})

describe("proxy CSRF gate", () => {
  it("returns 403 JSON for cross-site API mutations", () => {
    const headers = new Headers({
      "sec-fetch-site": "cross-site",
      origin: "https://evil.example",
      cookie: `${AUTH_COOKIES.csrf}=token`,
      "x-csrf-token": "token",
    })
    const req = new NextRequest("https://app.example.com/api/auth/logout", {
      method: "POST",
      headers,
    })
    const res = proxy(req)
    expect(res.status).toBe(403)
  })
})
