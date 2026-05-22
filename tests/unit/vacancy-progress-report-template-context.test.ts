import { describe, expect, it } from "vitest"
import { buildVacancyProgressReportTemplateContext } from "@/lib/reportes/vacancy-progress-report-template-context"
import { renderTechnicalSheetHtml } from "@/lib/technical-sheet/template-interpolate"
import { VACANCY_PROGRESS_REPORT_DEFAULT_TEMPLATE } from "@/lib/reportes/vacancy-progress-report-default-template"

const sampleRows = [
  {
    clientName: "Acme Corp",
    vacancyTitle: "Backend Developer",
    vacancyStatus: "open",
    openedAt: "2026-01-15",
    closedAt: null,
    totalCandidates: 5,
    candidatesInInterview: 2,
    candidatesFinalist: 1,
    candidatesHired: 0,
    progressPercent: 45,
    averagePreliminaryMatchScore: 78.5,
    candidatesWithPreliminaryAnalysis: 3,
    candidatesByStage: { Entrevista: 2, Finalista: 1 },
  },
  {
    clientName: "Acme Corp",
    vacancyTitle: "QA Analyst",
    vacancyStatus: "closed",
    openedAt: "2025-11-01",
    closedAt: "2026-02-01",
    totalCandidates: 0,
    progressPercent: 0,
  },
  {
    clientName: "Beta LLC",
    vacancyTitle: "Designer",
    vacancyStatus: "open",
    openedAt: "2026-03-01",
    totalCandidates: 8,
    candidatesInInterview: 1,
    candidatesHired: 2,
    progressPercent: 62,
    averagePreliminaryMatchScore: 81,
    candidatesWithPreliminaryAnalysis: 6,
  },
]

describe("buildVacancyProgressReportTemplateContext", () => {
  it("computes executive aggregates from rows", () => {
    const ctx = buildVacancyProgressReportTemplateContext({
      rows: sampleRows,
      totalCount: 12,
      generatedAt: "21/05/2026",
      periodStart: "01/05/2026",
      periodEnd: "21/05/2026",
      clientName: "Todos",
    })

    expect(ctx.totalCount).toBe("12")
    expect(ctx.totalVacancies).toBe("12")
    expect(ctx.totalClients).toBe("2")
    expect(ctx.totalCandidates).toBe("13")
    expect(ctx.openVacancies).toBe("2")
    expect(ctx.vacanciesWithoutCandidates).toBe("1")
    expect(ctx.candidatesInInterview).toBe("3")
    expect(ctx.candidatesHired).toBe("2")
    expect(ctx.generatedAt).toBe("21/05/2026")
    expect(ctx.periodStart).toBe("01/05/2026")
    expect(ctx.periodEnd).toBe("21/05/2026")
  })

  it("renders non-empty HTML fragments for tables and insights", () => {
    const ctx = buildVacancyProgressReportTemplateContext({
      rows: sampleRows,
      totalCount: 3,
      generatedAt: "21/05/2026",
      periodStart: "—",
      periodEnd: "—",
      clientName: "Todos",
    })

    expect(ctx.insightsHtml).toContain("<li>")
    expect(ctx.clientsRowsHtml).toContain("<tr>")
    expect(ctx.clientsRowsHtml).toContain("Acme Corp")
    expect(ctx.vacancyIndexRowsHtml).toContain("Backend Developer")
    expect(ctx.vacancyDetailCardsHtml).toContain("vacancy-card")
    expect(ctx.technicalRowsHtml).toContain("Beta LLC")
  })

  it("fills the default template without leaving raw placeholders", () => {
    const ctx = buildVacancyProgressReportTemplateContext({
      rows: sampleRows,
      totalCount: 3,
      generatedAt: "21/05/2026",
      periodStart: "01/05/2026",
      periodEnd: "21/05/2026",
      clientName: "Todos",
    })

    const html = renderTechnicalSheetHtml(VACANCY_PROGRESS_REPORT_DEFAULT_TEMPLATE, ctx)

    expect(html).not.toMatch(/\{\{[a-zA-Z]+\}\}/)
    expect(html).toContain("Estado de vacantes y candidatos")
    expect(html).toContain("Backend Developer")
    expect(html).toContain("Resumen ejecutivo")
    expect(html).toContain(">3<")
  })
})
