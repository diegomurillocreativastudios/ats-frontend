import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const renderReportHtmlToPdfBufferMock = vi.fn()
const buildVacancyProgressReportPdfKitBufferMock = vi.fn()

vi.mock("@/lib/reportes/render-report-pdf-with-chromium", () => ({
  renderReportHtmlToPdfBuffer: (...args: unknown[]) =>
    renderReportHtmlToPdfBufferMock(...args),
}))

vi.mock("@/lib/reportes/build-vacancy-progress-report-pdfkit-buffer", () => ({
  buildVacancyProgressReportPdfKitBuffer: (...args: unknown[]) =>
    buildVacancyProgressReportPdfKitBufferMock(...args),
}))

import {
  buildVacancyProgressReportPdfFilename,
  renderVacancyProgressReportPdfBuffer,
  VacancyProgressReportPdfError,
} from "@/lib/reportes/render-vacancy-progress-report-pdf-buffer"

describe("renderVacancyProgressReportPdfBuffer", () => {
  beforeEach(() => {
    renderReportHtmlToPdfBufferMock.mockReset()
    buildVacancyProgressReportPdfKitBufferMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("throws a 400 when previewHtml is empty", async () => {
    await expect(
      renderVacancyProgressReportPdfBuffer({ previewHtml: "   " })
    ).rejects.toBeInstanceOf(VacancyProgressReportPdfError)
  })

  it("renders the wrapped HTML with the report Chromium pipeline", async () => {
    const buf = Buffer.from("PDF")
    renderReportHtmlToPdfBufferMock.mockResolvedValue(buf)

    const fragment = `<style>@page { size: Letter; margin: 14mm; }</style><main>ok</main>`
    const out = await renderVacancyProgressReportPdfBuffer({
      previewHtml: fragment,
    })

    expect(out.buffer).toBe(buf)
    expect(out.engine).toBe("chromium")
    expect(renderReportHtmlToPdfBufferMock).toHaveBeenCalledTimes(1)
    const [html] = renderReportHtmlToPdfBufferMock.mock.calls[0] as [string]
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true)
    expect(html).toContain('<meta charset="utf-8" />')
    expect(html).toContain("<main>ok</main>")
    expect(html).toContain("data-report-pdf-wrapper")
  })

  it("falls back to PDFKit when Chromium throws", async () => {
    renderReportHtmlToPdfBufferMock.mockRejectedValue(new Error("chromium boom"))
    const fallbackBuf = Buffer.from("PDFKIT")
    buildVacancyProgressReportPdfKitBufferMock.mockResolvedValue(fallbackBuf)

    const rows = [
      { vacancyTitle: "Backend", totalCandidates: 5, candidatesHired: 1 },
      { vacancyTitle: "Frontend", totalCandidates: 7, candidatesHired: 0 },
    ]
    const summary = { generatedAt: "2026-01-01", totalVacancies: 2 }

    const out = await renderVacancyProgressReportPdfBuffer({
      previewHtml: "<main>x</main>",
      rows,
      summary,
      fileBaseName: "demo",
    })

    expect(out.buffer).toBe(fallbackBuf)
    expect(out.engine).toBe("pdfkit")
    expect(buildVacancyProgressReportPdfKitBufferMock).toHaveBeenCalledTimes(1)
    const [args] = buildVacancyProgressReportPdfKitBufferMock.mock.calls[0] as [
      { rows: unknown[]; summary: unknown; fileBaseName: string },
    ]
    expect(args.rows).toEqual(rows)
    expect(args.summary).toEqual(summary)
    expect(args.fileBaseName).toBe("demo")
  })

  it("throws a 500 only when both Chromium and PDFKit fail", async () => {
    renderReportHtmlToPdfBufferMock.mockRejectedValue(new Error("chromium boom"))
    buildVacancyProgressReportPdfKitBufferMock.mockRejectedValue(
      new Error("pdfkit boom")
    )

    await expect(
      renderVacancyProgressReportPdfBuffer({
        previewHtml: "<main>x</main>",
        rows: [],
        summary: null,
      })
    ).rejects.toMatchObject({ status: 500 })
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
