import type { ReportRuntimeRow } from "@/lib/api/recruiter-report-runtime"
import type { ReportSchema } from "@/lib/reportes/schema/report-schema-types"
import { buildReportSchemaPdfKitBuffer } from "@/lib/reportes/build-report-schema-pdfkit-buffer"
import {
  REPORT_PDF_ENGINE,
  reportPdfTemplateVersion,
} from "@/lib/reportes/report-pdf-constants"

export class ReportPdfError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface RenderReportPdfInput {
  reportKey: string
  reportName: string
  reportDescription?: string
  rows: ReportRuntimeRow[]
  totalCount: number
  appliedFilters: Record<string, string>
  clientName: string
  generatedAt: string
  fileBaseName?: string | null
  schema: ReportSchema
  extras?: Record<string, unknown> | null
}

export interface RenderReportPdfResult {
  buffer: Buffer
  engine: typeof REPORT_PDF_ENGINE
  templateVersion: string
  reportKey: string
}

export async function renderReportPdfBuffer(
  input: RenderReportPdfInput
): Promise<RenderReportPdfResult> {
  const rows = Array.isArray(input.rows) ? input.rows : []
  if (rows.length === 0) {
    throw new ReportPdfError(
      "No se recibieron filas para generar el PDF del reporte.",
      400
    )
  }

  try {
    const buffer = await buildReportSchemaPdfKitBuffer({
      reportKey: input.reportKey,
      reportName: input.reportName,
      reportDescription: input.reportDescription,
      rows,
      totalCount: input.totalCount,
      appliedFilters: input.appliedFilters,
      clientName: input.clientName,
      generatedAt: input.generatedAt,
      schema: input.schema,
      extras: input.extras ?? null,
    })

    const templateVersion = reportPdfTemplateVersion(input.reportKey)

    console.info("[Report PDF] PDFKit schema generation success", {
      reportKey: input.reportKey,
      pdfBytes: buffer.length,
      rows: rows.length,
      templateVersion,
    })

    return {
      buffer,
      engine: REPORT_PDF_ENGINE,
      templateVersion,
      reportKey: input.reportKey.trim(),
    }
  } catch (pdfkitError: unknown) {
    console.error(
      "[Report PDF] PDFKit schema generation failed",
      pdfkitError instanceof Error
        ? pdfkitError.stack ?? pdfkitError.message
        : pdfkitError
    )
    throw new ReportPdfError(
      "No se pudo generar el PDF del reporte con PDFKit.",
      500
    )
  }
}

export function buildReportPdfFilename(
  reportKey: string,
  baseName: string | null | undefined
): string {
  const fallback = reportKey.trim() || "reporte"
  const safe = (baseName ?? "").trim().toLowerCase()
  const slug = safe
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .slice(0, 64)
  const name = slug !== "" ? slug : fallback
  return `${name}.pdf`
}
