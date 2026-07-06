import { describe, expect, it } from "vitest"
import { CHROMIUM_PACK_PATH, isPublicPath } from "@/lib/auth/public-paths"

describe("isPublicPath", () => {
  it("allows chromium-pack.tar without auth (serverless PDF)", () => {
    expect(isPublicPath(CHROMIUM_PACK_PATH)).toBe(true)
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
})
