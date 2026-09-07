import { describe, expect, it } from "vitest"
import {
  isInternalPath,
  normalizeInternalPath,
  resolveAuthRedirectDestination,
} from "@/lib/auth/internal-path"

describe("normalizeInternalPath", () => {
  it("returns path and query for same-origin relative paths", () => {
    expect(normalizeInternalPath("/portal-rrhh")).toBe("/portal-rrhh")
    expect(normalizeInternalPath("/seleccion-portal")).toBe("/seleccion-portal")
    expect(normalizeInternalPath("/portal-rrhh?tab=1")).toBe(
      "/portal-rrhh?tab=1"
    )
    expect(normalizeInternalPath("  /portal-candidato  ")).toBe(
      "/portal-candidato"
    )
  })

  it("rejects external, protocol-relative, and escape attempts", () => {
    expect(normalizeInternalPath("https://evil.com")).toBeNull()
    expect(normalizeInternalPath("//evil.com")).toBeNull()
    expect(normalizeInternalPath("/\\evil.com")).toBeNull()
    expect(normalizeInternalPath("/%5cevil.com")).toBeNull()
    expect(normalizeInternalPath("/@evil.com")).toBeNull()
    expect(normalizeInternalPath("javascript:alert(1)")).toBeNull()
    expect(normalizeInternalPath("")).toBeNull()
    expect(normalizeInternalPath(null)).toBeNull()
    expect(normalizeInternalPath(undefined)).toBeNull()
  })
})

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
    expect(resolveAuthRedirectDestination(["//evil.com"])).toBe(
      "/seleccion-portal"
    )
  })

  it("returns normalized path for candidates with query", () => {
    expect(
      resolveAuthRedirectDestination(["/portal-rrhh?x=1"])
    ).toBe("/portal-rrhh?x=1")
  })
})
