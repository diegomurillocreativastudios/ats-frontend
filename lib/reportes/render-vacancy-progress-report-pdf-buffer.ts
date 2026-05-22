import { renderHtmlToPdfBuffer } from "@/lib/technical-sheet/html-to-pdf-chromium"
import { wrapVacancyProgressReportHtmlForPdf } from "@/lib/reportes/wrap-vacancy-progress-report-html-for-pdf"

export class VacancyProgressReportPdfError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface RenderVacancyProgressReportPdfInput {
  /** HTML interpolado del reporte (fragmento `<style>...</style><main>...</main>`). */
  previewHtml: string
}

/**
 * Renders the vacancy-progress report PDF using Chromium (`page.pdf`).
 * The template's own `@page` rule controls page size and margins via `preferCSSPageSize`.
 */
export async function renderVacancyProgressReportPdfBuffer(
  input: RenderVacancyProgressReportPdfInput
): Promise<Buffer> {
  const fragment = input.previewHtml?.trim() ?? ""
  if (fragment === "") {
    throw new VacancyProgressReportPdfError(
      "No se recibió HTML para generar el PDF del reporte.",
      400
    )
  }

  const documentHtml = wrapVacancyProgressReportHtmlForPdf(fragment)
  return renderHtmlToPdfBuffer(documentHtml, { mediaType: "print" })
}

export function buildVacancyProgressReportPdfFilename(
  baseName: string | null | undefined
): string {
  const fallback = "avance-de-vacantes-por-cliente"
  const safe = (baseName ?? "").trim().toLowerCase()
  const slug = safe
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .slice(0, 64)
  const name = slug !== "" ? slug : fallback
  return `${name}.pdf`
}
