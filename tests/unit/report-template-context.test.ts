import { describe, expect, it } from "vitest"
import { buildReportTemplateContext } from "@/lib/reportes/report-template-context"
import { renderTechnicalSheetHtml } from "@/lib/technical-sheet/template-interpolate"

describe("buildReportTemplateContext", () => {
  it("exposes summary metrics and filters for placeholders", () => {
    const ctx = buildReportTemplateContext({
      summary: {
        totalClients: 2,
        totalVacancies: 10,
        openVacancies: 6,
        closedVacancies: 4,
        totalCandidates: 50,
        candidatesInInterview: 5,
        candidatesHired: 3,
        averagePreliminaryMatchScore: 72.5,
      },
      filters: { clientName: "Acme", from: "01/03/2026", to: "31/03/2026" },
      logoUrl: "https://example.com/logo.png",
      generatedAt: "17/05/2026",
    })

    expect(ctx.summary).toMatchObject({ totalVacancies: 10 })
    expect(ctx.filters).toEqual({
      clientName: "Acme",
      from: "01/03/2026",
      to: "31/03/2026",
    })
    expect(ctx.clientName).toBe("Acme")
    expect(ctx.logoUrl).toBe("https://example.com/logo.png")
  })

  it("escapes HTML when interpolating report context values", () => {
    const ctx = buildReportTemplateContext({
      summary: { totalVacancies: 8, totalCandidates: 20 },
      filters: { clientName: "<script>x</script>", from: "—", to: "—" },
    })
    const html = renderTechnicalSheetHtml(
      "<p>Cliente: {{filters.clientName}} · Vacantes: {{summary.totalVacancies}}</p>",
      ctx
    )
    expect(html).toContain("Cliente: &lt;script&gt;x&lt;/script&gt;")
    expect(html).toContain("Vacantes: 8")
    expect(html).not.toMatch(/<script/i)
  })
})
