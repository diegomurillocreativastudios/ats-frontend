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
    minPreliminaryMatchScore: 55,
    maxPreliminaryMatchScore: 92,
    averageDaysToFill: 18,
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
    expect(ctx.totalInInterview).toBe("3")
    expect(ctx.totalHired).toBe("2")
    expect(ctx.totalFinalists).toBe("1")
    expect(ctx.candidatesWithAiAnalysis).toBe("9")
    expect(ctx.generatedAt).toBe("21/05/2026")
    expect(ctx.periodStart).toBe("01/05/2026")
    expect(ctx.periodEnd).toBe("21/05/2026")
    expect(ctx.periodLabel).toBe("01/05/2026 — 21/05/2026")
  })

  it("renders non-empty HTML fragments for tables, insights and highlights", () => {
    const ctx = buildVacancyProgressReportTemplateContext({
      rows: sampleRows,
      totalCount: 3,
      generatedAt: "21/05/2026",
      periodStart: "—",
      periodEnd: "—",
      clientName: "Todos",
    })

    expect(ctx.insightsHtml).toContain("<li>")
    expect(ctx.clientDistributionRows).toContain("<tr>")
    expect(ctx.clientDistributionRows).toContain("Acme Corp")
    expect(ctx.vacancyIndexRows).toContain("Backend Developer")
    expect(ctx.vacancyDetailCards).toContain("vacancy-card")
    expect(ctx.technicalRows).toContain("Beta LLC")

    expect(String(ctx.topProgressVacancy)).toContain("top-vacancy-label")
    expect(String(ctx.topAiScoreVacancy)).toContain("top-vacancy-metric")
    expect(String(ctx.topCandidatesVacancy)).toContain("top-vacancy-metric")

    expect(ctx.vacancyIndexRows).toContain("Abierta")
    expect(ctx.vacancyDetailCards).toContain("Score IA mínimo")
    expect(ctx.vacancyDetailCards).toContain("stage-pill")
  })

  it("fills the default template without leaving raw {{ placeholders", () => {
    const ctx = buildVacancyProgressReportTemplateContext({
      rows: sampleRows,
      totalCount: 3,
      generatedAt: "21/05/2026",
      periodStart: "01/05/2026",
      periodEnd: "21/05/2026",
      clientName: "Todos",
    })

    const html = renderTechnicalSheetHtml(
      VACANCY_PROGRESS_REPORT_DEFAULT_TEMPLATE,
      ctx
    )

    const stripped = html.replace(/<style[\s\S]*?<\/style>/gi, "")
    expect(stripped).not.toMatch(/\{\{[\s\S]+?\}\}/)
    expect(html).toContain("Estado de vacantes y candidatos")
    expect(html).toContain("Backend Developer")
    expect(html).toContain("Resumen ejecutivo")
    expect(html).toContain("Vacante con mayor avance")
    expect(html).toContain("Mejor match IA")
    expect(html).toContain("Más candidatos")
    expect(html).toContain("Score IA mínimo")
    expect(html).toContain("stage-pill")
  })

  it("falls back to '—' for missing per-row metrics in the default template", () => {
    const ctx = buildVacancyProgressReportTemplateContext({
      rows: [
        {
          clientName: "Empty Corp",
          vacancyTitle: "Lonely Vacancy",
          vacancyStatus: "open",
          openedAt: "2026-04-01",
        },
      ],
      totalCount: 1,
      generatedAt: "21/05/2026",
      periodStart: "—",
      periodEnd: "—",
      clientName: "Empty Corp",
    })

    const html = renderTechnicalSheetHtml(
      VACANCY_PROGRESS_REPORT_DEFAULT_TEMPLATE,
      ctx
    )

    expect(html).toContain("Lonely Vacancy")
    expect(html).toContain("Sin etapas registradas")
    expect(ctx.periodLabel).toBe("—")
  })
})
