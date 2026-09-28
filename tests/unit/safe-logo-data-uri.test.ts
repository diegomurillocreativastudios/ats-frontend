import { describe, expect, it } from "vitest"
import {
  buildSafeLogoDataUri,
  isSvgImageContentType,
} from "@/lib/safe-logo-data-uri"

describe("isSvgImageContentType", () => {
  it("detects svg mime types", () => {
    expect(isSvgImageContentType("image/svg+xml")).toBe(true)
    expect(isSvgImageContentType("image/svg+xml; charset=utf-8")).toBe(true)
    expect(isSvgImageContentType("IMAGE/SVG")).toBe(true)
    expect(isSvgImageContentType("image/png")).toBe(false)
  })
})

describe("buildSafeLogoDataUri", () => {
  it("returns null for empty or missing logos", () => {
    expect(buildSafeLogoDataUri(null)).toBeNull()
    expect(buildSafeLogoDataUri({ base64: "", contentType: "image/png" })).toBeNull()
  })

  it("builds raster data URIs", () => {
    expect(
      buildSafeLogoDataUri({ base64: "abc123", contentType: "image/png" })
    ).toBe("data:image/png;base64,abc123")
    expect(
      buildSafeLogoDataUri({ base64: "abc123", contentType: "image/jpeg" })
    ).toBe("data:image/jpeg;base64,abc123")
  })

  it("rejects SVG content types", () => {
    expect(
      buildSafeLogoDataUri({
        base64: "PHN2Zy8+",
        contentType: "image/svg+xml",
      })
    ).toBeNull()
  })

  it("rejects SVG data URIs and keeps safe data URIs", () => {
    expect(
      buildSafeLogoDataUri({
        base64: "data:image/svg+xml;base64,PHN2Zy8+",
      })
    ).toBeNull()
    expect(
      buildSafeLogoDataUri({
        base64: "data:image/png;base64,abc123",
      })
    ).toBe("data:image/png;base64,abc123")
  })
})
