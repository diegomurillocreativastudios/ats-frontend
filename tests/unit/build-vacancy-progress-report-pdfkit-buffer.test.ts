import { describe, expect, it } from "vitest"
import { buildVacancyProgressReportPdfKitBuffer } from "@/lib/reportes/build-vacancy-progress-report-pdfkit-buffer"
import { VACANCY_PROGRESS_PDF_TEMPLATE_VERSION } from "@/lib/reportes/vacancy-progress-pdf-constants"
const EXPECTED_PAGE_COUNT_FOR_12_ROWS = 9
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
    })

    const pageCount = countPdfPages(buffer)
    expect(pageCount).toBe(EXPECTED_PAGE_COUNT_FOR_12_ROWS)
    expect(pageCount).toBeLessThan(12)
    expect(pageCount).not.toBe(21)
  })

  it("omits the debug footer marker in production", async () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "production"

    try {
      const buffer = await buildVacancyProgressReportPdfKitBuffer({
        rows: sampleRows,
        summary: {
          generatedAt: "22/05/2026",
          periodStart: "01/05/2026",
          periodEnd: "22/05/2026",
          totalCount: 12,
        },
      })

      expect(countPdfPages(buffer)).toBe(EXPECTED_PAGE_COUNT_FOR_12_ROWS)

      expect(buffer.toString("latin1")).not.toContain(FOOTER_DEBUG_MARKER)
    } finally {
      process.env.NODE_ENV = previousNodeEnv
    }
  })

  it("returns a minimal PDF when there are no rows", async () => {
    const buffer = await buildVacancyProgressReportPdfKitBuffer({
      rows: [],
      summary: {
        generatedAt: "22/05/2026",
        totalCount: 0,
      },
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
        clientName: "Visible Outsource",
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
    })

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
    expect(buffer.length).toBeGreaterThan(5000)
    expect(countPdfPages(buffer)).toBeGreaterThanOrEqual(5)
    expect(countPdfPages(buffer)).toBeLessThan(12)
  })
})
