import { describe, expect, it } from "vitest"
import { formatIsoDateForPdf } from "@/lib/reportes/executive-summary-metrics"

describe("formatIsoDateForPdf", () => {
  it("formats ISO date as DD/MM/YYYY", () => {
    expect(formatIsoDateForPdf("2026-05-01")).toBe("01/05/2026")
  })
})
