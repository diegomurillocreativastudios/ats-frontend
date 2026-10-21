import { afterEach, describe, expect, it, vi } from "vitest"
import { resolvePublicApiOrigin } from "@/lib/public-api-origin"

describe("resolvePublicApiOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns the https origin and drops a trailing slash", () => {
    expect(resolvePublicApiOrigin("https://api.example.com/")).toBe(
      "https://api.example.com"
    )
  })

  it("rejects paths, queries, credentials, and empty values", () => {
    expect(resolvePublicApiOrigin("https://api.example.com/api")).toBeNull()
    expect(resolvePublicApiOrigin("https://api.example.com?x=1")).toBeNull()
    expect(resolvePublicApiOrigin("https://user:secret@api.example.com")).toBeNull()
    expect(resolvePublicApiOrigin("  ")).toBeNull()
    expect(resolvePublicApiOrigin("")).toBeNull()
  })

  it("allows http only in development", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(resolvePublicApiOrigin("http://localhost:10000")).toBeNull()

    vi.stubEnv("NODE_ENV", "development")
    expect(resolvePublicApiOrigin("http://localhost:10000")).toBe(
      "http://localhost:10000"
    )
  })
})
