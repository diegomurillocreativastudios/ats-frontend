import { describe, expect, it, vi, afterEach } from "vitest"
import { tryLoadVisibleLogoDataUriForTechnicalSheetPdf } from "@/lib/technical-sheet/technical-sheet-pdf-logo"

describe("tryLoadVisibleLogoDataUriForTechnicalSheetPdf", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns an SVG data URI from public/Applican_Tree.svg without using NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    vi.stubEnv("VERCEL_URL", "")
    const uri = tryLoadVisibleLogoDataUriForTechnicalSheetPdf()
    expect(uri).toBeTruthy()
    expect(uri).toMatch(/^data:image\/svg\+xml;base64,/)
    expect(uri!.length).toBeGreaterThan(100)
  })
})
