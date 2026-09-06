import { describe, expect, it } from "vitest"
import { buildVacancyProgressReportPdfKitBuffer } from "@/lib/reportes/build-vacancy-progress-report-pdfkit-buffer"
import type { ReportSchema } from "@/lib/reportes/schema/report-schema-types"
import { VACANCY_PROGRESS_PDF_TEMPLATE_VERSION } from "@/lib/reportes/vacancy-progress-pdf-constants"
const MIN_PAGE_COUNT = 1
const MAX_PAGE_COUNT_FOR_12_ROWS = 12
const FOOTER_DEBUG_MARKER = `PDFKit v2 · ${VACANCY_PROGRESS_PDF_TEMPLATE_VERSION}`

/** Counts `/Type /Page` entries (excludes `/Pages`). */
function countPdfPages(buffer: Buffer): number {
  const source = buffer.toString("latin1")
  const matches = source.match(/\/Type\s*\/Page(?![s])/g)
  return matches?.length ?? 0
}

const sampleRows = Array.from({ length: 12 }, (_, index) => ({
  clientName: index % 3 === 0 ? "Acme Corp" : index % 3 === 1 ? "Beta LLC" : "Gamma SA",
  vacancyTitle: `Vacante ${index + 1}`,
  vacancyStatus: index % 2 === 0 ? "open" : "closed",
  openedAt: "2026-01-15",
  closedAt: index % 2 === 1 ? "2026-03-01" : null,
  totalCandidates: (index % 5) + 1,
  candidatesInInterview: index % 3,
  candidatesFinalist: index % 2,
  candidatesHired: index % 4 === 0 ? 1 : 0,
  progressPercent: 20 + index * 5,
  averagePreliminaryMatchScore: 60 + index,
  minPreliminaryMatchScore: 40 + index,
  maxPreliminaryMatchScore: 80 + index,
  averageDaysToFill: 10 + index,
  candidatesWithPreliminaryAnalysis: index % 3,
  candidatesByStage:
    index % 2 === 0
      ? { Entrevista: index % 3, Finalista: index % 2 }
      : undefined,
}))

const sampleSchema: ReportSchema = {
  version: 1,
  reportKey: "vacancy-progress-by-client",
  title: "Reporte",
  sections: [
    {
      type: "heroHeader",
      title: "Estado de vacantes y candidatos",
      meta: [
        { label: "FECHA DE GENERACIÓN", value: "{{generatedAt}}" },
        { label: "PERIODO", value: "{{periodLabel}}" },
        { label: "TOTAL DE REGISTROS", value: "{{totalCount}}" },
      ],
    },
    {
      type: "kpiGrid",
      title: "Resumen ejecutivo",
      columns: 4,
      items: [
        { label: "Vacantes", value: "{{totalVacancies}}", caption: "{{openVacancies}} abiertas" },
        { label: "Clientes", value: "{{totalClients}}" },
        { label: "Candidatos", value: "{{totalCandidates}}" },
        { label: "Score IA promedio", value: "{{averageAiScore}}" },
      ],
    },
    {
      type: "table",
      title: "Distribución por cliente",
      rowsBinding: "clientDistribution",
      columns: [
        { header: "Cliente", binding: "clientName", align: "left", width: "2fr" },
        { header: "Vacantes", binding: "vacancies", align: "center", width: "1fr" },
      ],
    },
  ],
}

describe("buildVacancyProgressReportPdfKitBuffer", () => {
  it("produces a non-empty PDF buffer for 12 rows", async () => {
    const buffer = await buildVacancyProgressReportPdfKitBuffer({
      rows: sampleRows,
      summary: {
        generatedAt: "22/05/2026",
        periodStart: "01/05/2026",
        periodEnd: "22/05/2026",
        totalCount: 12,
      },
      schema: sampleSchema,
    })

    expect(buffer.length).toBeGreaterThan(5000)
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
  })

  it("exports the v2 template version constant", () => {
    expect(VACANCY_PROGRESS_PDF_TEMPLATE_VERSION).toBe("vacancy-progress-full-v2")
  })

  it("does not add footer-only pages for 12 rows", async () => {
    const buffer = await buildVacancyProgressReportPdfKitBuffer({
      rows: sampleRows,
      summary: {
        generatedAt: "22/05/2026",
        periodStart: "01/05/2026",
        periodEnd: "22/05/2026",
        totalCount: 12,
      },
      schema: sampleSchema,
    })

    const pageCount = countPdfPages(buffer)
    expect(pageCount).toBeGreaterThanOrEqual(MIN_PAGE_COUNT)
    expect(pageCount).toBeLessThan(MAX_PAGE_COUNT_FOR_12_ROWS)
  })

  it("omits the debug footer marker in production", async () => {
    const previousNodeEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    })

    try {
      const buffer = await buildVacancyProgressReportPdfKitBuffer({
        rows: sampleRows,
        summary: {
          generatedAt: "22/05/2026",
          periodStart: "01/05/2026",
          periodEnd: "22/05/2026",
          totalCount: 12,
        },
        schema: sampleSchema,
      })

      expect(countPdfPages(buffer)).toBeGreaterThanOrEqual(MIN_PAGE_COUNT)

      expect(buffer.toString("latin1")).not.toContain(FOOTER_DEBUG_MARKER)
    } finally {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: previousNodeEnv,
        configurable: true,
      })
    }
  })

  it("returns a minimal PDF when there are no rows", async () => {
    const buffer = await buildVacancyProgressReportPdfKitBuffer({
      rows: [],
      summary: {
        generatedAt: "22/05/2026",
        totalCount: 0,
      },
      schema: sampleSchema,
    })
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
    expect(buffer.length).toBeGreaterThan(100)
  })

  it("renders the vacancy detail cards with long titles and client names without overlap", async () => {
    const fixtureRows = [
      {
        clientName: "Creativa Studios",
        vacancyTitle: "Sales Agent",
        vacancyStatus: "open",
        openedAt: "2026-01-15",
        totalCandidates: 12,
        candidatesInInterview: 4,
        candidatesFinalist: 2,
        candidatesHired: 1,
        progressPercent: 60,
        averagePreliminaryMatchScore: 78,
        minPreliminaryMatchScore: 55,
        maxPreliminaryMatchScore: 92,
        averageDaysToFill: 18,
        candidatesByStage: { Entrevista: 4, Finalista: 2, Contratado: 1 },
      },
      {
        clientName: "Applican Tree",
        vacancyTitle: "Frontend Developer",
        vacancyStatus: "open",
        openedAt: "2026-02-01",
        totalCandidates: 9,
        candidatesInInterview: 3,
        candidatesFinalist: 1,
        candidatesHired: 0,
        progressPercent: 35,
        averagePreliminaryMatchScore: 65,
        minPreliminaryMatchScore: 42,
        maxPreliminaryMatchScore: 88,
        averageDaysToFill: 25,
        candidatesByStage: { "En revisión": 5, Entrevista: 3, Finalista: 1 },
      },
      {
        clientName:
          "International Outsourcing Consulting Group of the Americas SA de CV Internacional",
        vacancyTitle: "Backend Engineer",
        vacancyStatus: "closed",
        openedAt: "2026-01-01",
        closedAt: "2026-03-15",
        totalCandidates: 4,
        candidatesInInterview: 2,
        candidatesFinalist: 1,
        candidatesHired: 1,
        progressPercent: 100,
        averagePreliminaryMatchScore: 88,
        minPreliminaryMatchScore: 72,
        maxPreliminaryMatchScore: 95,
        averageDaysToFill: 73,
        candidatesByStage: { Entrevista: 2, Finalista: 1, Contratado: 1 },
      },
      {
        clientName: "Acme",
        vacancyTitle:
          "Senior Staff Engineer for Platform Foundations and Distributed Systems Architecture",
        vacancyStatus: "open",
        openedAt: "2026-02-15",
        totalCandidates: 3,
        candidatesInInterview: 1,
        candidatesFinalist: 0,
        candidatesHired: 0,
        progressPercent: 20,
        averagePreliminaryMatchScore: 55,
        minPreliminaryMatchScore: 38,
        maxPreliminaryMatchScore: 72,
        averageDaysToFill: 7,
        candidatesByStage: { "En revisión": 2, Entrevista: 1 },
      },
    ]

    const buffer = await buildVacancyProgressReportPdfKitBuffer({
      rows: fixtureRows,
      summary: {
        generatedAt: "22/05/2026",
        periodStart: "01/01/2026",
        periodEnd: "22/05/2026",
        totalCount: fixtureRows.length,
      },
      schema: sampleSchema,
    })

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
    expect(buffer.length).toBeGreaterThan(5000)
    expect(countPdfPages(buffer)).toBeGreaterThanOrEqual(5)
    expect(countPdfPages(buffer)).toBeLessThan(12)
  })
})
