import { describe, expect, it } from "vitest"
import { isPublicPath } from "@/lib/auth/public-paths"

describe("isPublicPath", () => {
  it("does not treat the legacy chromium pack as a public path", () => {
    expect(isPublicPath("/chromium-pack.tar")).toBe(false)
  })

  it("allows API routes", () => {
    expect(isPublicPath("/api/health")).toBe(true)
  })

  it("requires auth for recruiter portal routes", () => {
    expect(isPublicPath("/portal-rrhh")).toBe(false)
  })

  it("allows privacy policy without auth", () => {
    expect(isPublicPath("/privacy-policy")).toBe(true)
  })

  it("allows linkedin sso success without auth", () => {
    expect(isPublicPath("/auth/sso/success")).toBe(true)
    expect(isPublicPath("/auth/sso/success/")).toBe(true)
  })
})
