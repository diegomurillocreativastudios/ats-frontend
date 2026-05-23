import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const buildVacancyProgressReportPdfKitBufferMock = vi.fn()

vi.mock("@/lib/reportes/build-vacancy-progress-report-pdfkit-buffer", () => ({
  buildVacancyProgressReportPdfKitBuffer: (...args: unknown[]) =>
    buildVacancyProgressReportPdfKitBufferMock(...args),
  VACANCY_PROGRESS_PDF_TEMPLATE_VERSION: "vacancy-progress-full-v2",
}))

import {
  buildVacancyProgressReportPdfFilename,
  renderVacancyProgressReportPdfBuffer,
  VacancyProgressReportPdfError,
} from "@/lib/reportes/render-vacancy-progress-report-pdf-buffer"

describe("renderVacancyProgressReportPdfBuffer", () => {
  beforeEach(() => {
    buildVacancyProgressReportPdfKitBufferMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("throws a 400 when rows and summary are both empty", async () => {
    await expect(
      renderVacancyProgressReportPdfBuffer({ rows: [], summary: null })
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("No se recibieron filas"),
    })
    expect(buildVacancyProgressReportPdfKitBufferMock).not.toHaveBeenCalled()
  })

  it("calls buildVacancyProgressReportPdfKitBuffer and returns pdfkit-v2", async () => {
    const buf = Buffer.from("PDFKIT-V2")
    buildVacancyProgressReportPdfKitBufferMock.mockResolvedValue(buf)

    const rows = [
      { vacancyTitle: "Backend", totalCandidates: 5, candidatesHired: 1 },
      { vacancyTitle: "Frontend", totalCandidates: 7, candidatesHired: 0 },
    ]
    const summary = { generatedAt: "2026-01-01", totalVacancies: 2 }

    const out = await renderVacancyProgressReportPdfBuffer({
      rows,
      summary,
      fileBaseName: "demo",
    })

    expect(out.buffer).toBe(buf)
    expect(out.engine).toBe("pdfkit-v2")
    expect(out.templateVersion).toBe("vacancy-progress-full-v2")
    expect(buildVacancyProgressReportPdfKitBufferMock).toHaveBeenCalledTimes(1)
    const [args] = buildVacancyProgressReportPdfKitBufferMock.mock.calls[0] as [
      { rows: unknown[]; summary: unknown; fileBaseName: string },
    ]
    expect(args.rows).toEqual(rows)
    expect(args.summary).toEqual(summary)
    expect(args.fileBaseName).toBe("demo")
  })

  it("accepts metadata as an alias for summary", async () => {
    const buf = Buffer.from("PDF")
    buildVacancyProgressReportPdfKitBufferMock.mockResolvedValue(buf)
    const metadata = { generatedAt: "2026-05-22", totalCount: 12 }

    await renderVacancyProgressReportPdfBuffer({
      rows: [{ vacancyTitle: "QA" }],
      metadata,
    })

    const [args] = buildVacancyProgressReportPdfKitBufferMock.mock.calls[0] as [
      { summary: unknown },
    ]
    expect(args.summary).toEqual(metadata)
  })

  it("throws a 500 when PDFKit v2 fails", async () => {
    buildVacancyProgressReportPdfKitBufferMock.mockRejectedValue(
      new Error("pdfkit boom")
    )

    await expect(
      renderVacancyProgressReportPdfBuffer({
        rows: [{ vacancyTitle: "x" }],
        summary: { totalCount: 1 },
      })
    ).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining("PDFKit v2"),
    })
  })
})

describe("buildVacancyProgressReportPdfFilename", () => {
  it("slugifies the base name and appends .pdf", () => {
    expect(buildVacancyProgressReportPdfFilename("Avance de Vacantes")).toBe(
      "avance-de-vacantes.pdf"
    )
  })

  it("falls back to a default name when the input is empty", () => {
    expect(buildVacancyProgressReportPdfFilename(null)).toBe(
      "avance-de-vacantes-por-cliente.pdf"
    )
    expect(buildVacancyProgressReportPdfFilename("   ")).toBe(
      "avance-de-vacantes-por-cliente.pdf"
    )
  })

  it("strips unsafe characters", () => {
    expect(buildVacancyProgressReportPdfFilename("Reporte / 2026?")).toBe(
      "reporte-2026.pdf"
    )
  })
})
