import { describe, expect, it } from "vitest"
import { resolveHtml2CanvasScale } from "@/lib/pdf/resolve-html2canvas-scale"

describe("resolveHtml2CanvasScale", () => {
  it("keeps requested scale when dimensions fit", () => {
    expect(resolveHtml2CanvasScale(816, 2000, 2)).toBe(2)
  })

  it("reduces scale for very tall content", () => {
    const scale = resolveHtml2CanvasScale(816, 50000, 2)
    expect(scale).toBeLessThan(2)
    expect(816 * scale).toBeLessThanOrEqual(16384)
    expect(50000 * scale).toBeLessThanOrEqual(16384 + 1)
  })
})
