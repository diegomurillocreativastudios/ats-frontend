import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import {
  buildVacancyProgressReportPdfKitBuffer,
  type VacancyProgressReportPdfKitSummary,
} from "@/lib/reportes/build-vacancy-progress-report-pdfkit-buffer"
import { renderReportHtmlToPdfBuffer } from "@/lib/reportes/render-report-pdf-with-chromium"
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
  /** Filas crudas para reconstruir el fallback PDFKit cuando Chromium falla. */
  rows?: VacancyProgressByClientRow[]
  /** Resumen estructurado para el fallback PDFKit (totales, periodo, cliente). */
  summary?: VacancyProgressReportPdfKitSummary | null
  /** Nombre base para personalizar el documento de fallback. */
  fileBaseName?: string | null
}

export interface RenderVacancyProgressReportPdfResult {
  buffer: Buffer
  engine: "chromium" | "pdfkit"
}

/**
 * Detects unresolved `{{...}}` template placeholders or unsupported control blocks
 * in the interpolated HTML. We strip the embedded `<style>` block first so that
 * CSS `{}` characters never trigger false positives, then look for any
 * `{{anything}}` token in the remaining body.
 */
function assertNoUnresolvedPlaceholders(html: string): void {
  const withoutStyles = html.replace(/<style[\s\S]*?<\/style>/gi, "")
  if (/\{\{[\s\S]+?\}\}/.test(withoutStyles)) {
    const offender = withoutStyles.match(/\{\{[\s\S]{0,80}?\}\}/)?.[0] ?? "{{?}}"
    throw new VacancyProgressReportPdfError(
      `La plantilla contiene placeholders sin interpolar: ${offender}`,
      400
    )
  }
}

/**
 * Genera el PDF del reporte "Avance de vacantes por cliente" con Chromium
 * (`page.pdf` + `preferCSSPageSize`). Si Chromium falla, reconstruye un PDF
 * formal con PDFKit a partir de `rows` y `summary`, de manera que el cliente
 * siempre reciba un `application/pdf` descargable.
 */
export async function renderVacancyProgressReportPdfBuffer(
  input: RenderVacancyProgressReportPdfInput
): Promise<RenderVacancyProgressReportPdfResult> {
  const fragment = input.previewHtml?.trim() ?? ""
  if (fragment === "") {
    throw new VacancyProgressReportPdfError(
      "No se recibió HTML para generar el PDF del reporte.",
      400
    )
  }

  assertNoUnresolvedPlaceholders(fragment)

  const documentHtml = wrapVacancyProgressReportHtmlForPdf(fragment)
  console.info("[Report PDF] Chromium generation started", {
    htmlBytes: documentHtml.length,
    rows: Array.isArray(input.rows) ? input.rows.length : 0,
  })

  try {
    const buffer = await renderReportHtmlToPdfBuffer(documentHtml)
    console.info("[Report PDF] Chromium generation success", {
      pdfBytes: buffer.length,
    })
    return { buffer, engine: "chromium" }
  } catch (chromiumError: unknown) {
    console.warn(
      "[Report PDF] Chromium failed, using PDFKit fallback",
      chromiumError instanceof Error
        ? chromiumError.stack ?? chromiumError.message
        : chromiumError
    )

    try {
      const fallback = await buildVacancyProgressReportPdfKitBuffer({
        rows: Array.isArray(input.rows) ? input.rows : [],
        summary: input.summary ?? null,
        fileBaseName: input.fileBaseName ?? null,
        reportTitle: "Avance de vacantes por cliente",
      })
      console.info("[Report PDF] PDFKit fallback success", {
        pdfBytes: fallback.length,
      })
      return { buffer: fallback, engine: "pdfkit" }
    } catch (pdfkitError: unknown) {
      console.error(
        "[Report PDF] PDFKit fallback failed",
        pdfkitError instanceof Error
          ? pdfkitError.stack ?? pdfkitError.message
          : pdfkitError
      )
      throw new VacancyProgressReportPdfError(
        "No se pudo generar el PDF del reporte (Chromium y PDFKit fallaron).",
        500
      )
    }
  }
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
