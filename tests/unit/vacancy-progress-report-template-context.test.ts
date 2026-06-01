import { describe, expect, it } from "vitest"
import { buildVacancyProgressReportTemplateContext } from "@/lib/reportes/vacancy-progress-report-template-context"

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

  it("builds structured collections for tables and cards", () => {
    const ctx = buildVacancyProgressReportTemplateContext({
      rows: sampleRows,
      totalCount: 3,
      generatedAt: "21/05/2026",
      periodStart: "—",
      periodEnd: "—",
      clientName: "Todos",
    })

    expect(ctx.clientDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ clientName: "Acme Corp", vacancies: "2" }),
      ])
    )
    expect(ctx.vacancyIndexRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vacancyTitle: "Backend Developer" }),
      ])
    )
    expect(ctx.technicalRows).toEqual(
      expect.arrayContaining([expect.objectContaining({ clientName: "Beta LLC" })])
    )
    expect(ctx.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vacancyStatusLabel: "Abierta" }),
      ])
    )
    expect(ctx.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ minPreliminaryMatchScoreLabel: "55.0" }),
      ])
    )
    expect(ctx.rows[0]?.candidatesByStageEntries.length).toBeGreaterThanOrEqual(1)
  })

  it("summarizes top vacancies with label + metric", () => {
    const ctx = buildVacancyProgressReportTemplateContext({
      rows: sampleRows,
      totalCount: 3,
      generatedAt: "21/05/2026",
      periodStart: "01/05/2026",
      periodEnd: "21/05/2026",
      clientName: "Todos",
    })

    expect(ctx.topProgressVacancy).toContain("(")
    expect(ctx.topAiScoreVacancy).toContain("(")
    expect(ctx.topCandidatesVacancy).toContain("(")
  })

  it("falls back to '—' for missing per-row metrics", () => {
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

    expect(ctx.periodLabel).toBe("—")
    expect(ctx.rows[0]?.progressPercentLabel).toBe("—")
    expect(ctx.rows[0]?.candidatesByStageEntries.length).toBe(0)
  })
})
