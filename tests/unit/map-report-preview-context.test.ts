import { describe, expect, it } from "vitest"
import {
  mapPreviewContextToExecutivePdfData,
  mapPreviewContextToPdfFilters,
} from "@/lib/reportes/map-report-preview-context"

describe("mapPreviewContextToExecutivePdfData", () => {
  it("maps summary block from preview context", () => {
    const data = mapPreviewContextToExecutivePdfData({
      summary: {
        totalVacancies: 12,
        totalCandidates: 40,
        openVacancies: 8,
        closedVacancies: 4,
      },
    })

    expect(data?.totalVacancies).toBe(12)
    expect(data?.totalCandidates).toBe(40)
  })
})

describe("mapPreviewContextToPdfFilters", () => {
  it("prefers filters from context over applied filters", () => {
    const filters = mapPreviewContextToPdfFilters(
      {
        filters: { clientName: "Acme", from: "01/05/2026", to: "17/05/2026" },
      },
      { clientId: "x", dateFrom: "2026-05-01", dateTo: "2026-05-17" }
    )

    expect(filters).toEqual({
      clientName: "Acme",
      from: "01/05/2026",
      to: "17/05/2026",
    })
  })
})
