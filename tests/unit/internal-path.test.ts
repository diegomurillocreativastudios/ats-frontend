import { describe, expect, it } from "vitest"
import {
  isInternalPath,
  resolveAuthRedirectDestination,
} from "@/lib/auth/internal-path"

describe("isInternalPath", () => {
  it("accepts internal absolute paths", () => {
    expect(isInternalPath("/portal-rrhh")).toBe(true)
    expect(isInternalPath("/seleccion-portal")).toBe(true)
  })

  it("rejects external URLs and protocol-relative paths", () => {
    expect(isInternalPath("https://evil.com")).toBe(false)
    expect(isInternalPath("//evil.com")).toBe(false)
    expect(isInternalPath("")).toBe(false)
    expect(isInternalPath(null)).toBe(false)
  })
})

describe("resolveAuthRedirectDestination", () => {
  it("prefers the first valid internal candidate", () => {
    expect(
      resolveAuthRedirectDestination([
        "https://evil.com",
        "/portal-rrhh",
        "/portal-candidato",
      ])
    ).toBe("/portal-rrhh")
  })

  it("falls back to seleccion-portal", () => {
    expect(resolveAuthRedirectDestination([null, "https://evil.com"])).toBe(
      "/seleccion-portal"
    )
  })
})
