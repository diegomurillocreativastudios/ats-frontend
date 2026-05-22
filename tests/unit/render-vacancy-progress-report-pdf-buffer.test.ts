import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const renderHtmlToPdfBufferMock = vi.fn()

vi.mock("@/lib/technical-sheet/html-to-pdf-chromium", () => ({
  renderHtmlToPdfBuffer: (...args: unknown[]) => renderHtmlToPdfBufferMock(...args),
}))

import {
  buildVacancyProgressReportPdfFilename,
  renderVacancyProgressReportPdfBuffer,
  VacancyProgressReportPdfError,
} from "@/lib/reportes/render-vacancy-progress-report-pdf-buffer"

describe("renderVacancyProgressReportPdfBuffer", () => {
  beforeEach(() => {
    renderHtmlToPdfBufferMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("throws a 400 when previewHtml is empty", async () => {
    await expect(
      renderVacancyProgressReportPdfBuffer({ previewHtml: "   " })
    ).rejects.toBeInstanceOf(VacancyProgressReportPdfError)
  })

  it("wraps the HTML fragment and forwards print media to Chromium", async () => {
    const buf = Buffer.from("PDF")
    renderHtmlToPdfBufferMock.mockResolvedValue(buf)

    const fragment = `<style>@page { size: Letter; margin: 14mm; }</style><main>ok</main>`
    const out = await renderVacancyProgressReportPdfBuffer({ previewHtml: fragment })

    expect(out).toBe(buf)
    expect(renderHtmlToPdfBufferMock).toHaveBeenCalledTimes(1)
    const [html, options] = renderHtmlToPdfBufferMock.mock.calls[0] as [string, { mediaType: string }]
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true)
    expect(html).toContain('<meta charset="utf-8" />')
    expect(html).toContain("<main>ok</main>")
    expect(options).toEqual({ mediaType: "print" })
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
