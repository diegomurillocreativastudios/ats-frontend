import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import {
  buildVacancyProgressReportPdfKitBuffer,
  type VacancyProgressReportPdfKitSummary,
} from "@/lib/reportes/build-vacancy-progress-report-pdfkit-buffer"
import type { ReportSchema } from "@/lib/reportes/schema/report-schema-types"
import {
  VACANCY_PROGRESS_PDF_ENGINE,
  VACANCY_PROGRESS_PDF_TEMPLATE_VERSION,
} from "@/lib/reportes/vacancy-progress-pdf-constants"

export class VacancyProgressReportPdfError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface RenderVacancyProgressReportPdfInput {
  rows: VacancyProgressByClientRow[]
  summary?: VacancyProgressReportPdfKitSummary | null
  metadata?: VacancyProgressReportPdfKitSummary | null
  fileBaseName?: string | null
  schema: ReportSchema
}

export interface RenderVacancyProgressReportPdfResult {
  buffer: Buffer
  engine: typeof VACANCY_PROGRESS_PDF_ENGINE
  templateVersion: typeof VACANCY_PROGRESS_PDF_TEMPLATE_VERSION
}

/**
 * Generates the vacancy-progress-by-client PDF exclusively via PDFKit v2.
 * Data comes from `rows`, `summary` and optional `metadata` — never from HTML preview.
 */
export async function renderVacancyProgressReportPdfBuffer(
  input: RenderVacancyProgressReportPdfInput
): Promise<RenderVacancyProgressReportPdfResult> {
  const rows = Array.isArray(input.rows) ? input.rows : []
  const summary = input.summary ?? input.metadata ?? null

  if (rows.length === 0 && summary == null) {
    throw new VacancyProgressReportPdfError(
      "No se recibieron filas ni resumen para generar el PDF del reporte.",
      400
    )
  }

  try {
    const buffer = await buildVacancyProgressReportPdfKitBuffer({
      rows,
      summary,
      fileBaseName: input.fileBaseName ?? null,
      schema: input.schema,
    })

    console.info("[Report PDF] PDFKit v2 generation success", {
      pdfBytes: buffer.length,
      rows: rows.length,
      templateVersion: VACANCY_PROGRESS_PDF_TEMPLATE_VERSION,
    })

    return {
      buffer,
      engine: VACANCY_PROGRESS_PDF_ENGINE,
      templateVersion: VACANCY_PROGRESS_PDF_TEMPLATE_VERSION,
    }
  } catch (pdfkitError: unknown) {
    console.error(
      "[Report PDF] PDFKit v2 generation failed",
      pdfkitError instanceof Error
        ? pdfkitError.stack ?? pdfkitError.message
        : pdfkitError
    )
    throw new VacancyProgressReportPdfError(
      "No se pudo generar el PDF del reporte con PDFKit v2.",
      500
    )
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

export {
  VACANCY_PROGRESS_PDF_ENGINE,
  VACANCY_PROGRESS_PDF_TEMPLATE_VERSION,
} from "@/lib/reportes/vacancy-progress-pdf-constants"
