import PDFDocument from "pdfkit"
import type { ReportRuntimeRow } from "@/lib/api/recruiter-report-runtime"
import type { ReportSchema } from "@/lib/reportes/schema/report-schema-types"
import { renderReportSchemaToPdfKit } from "@/lib/reportes/schema/render-report-schema-to-pdfkit"
import { applyBufferedPageFooters } from "@/lib/reportes/pdfkit/report-pdfkit-primitives"
import { reportPdfTemplateVersion } from "@/lib/reportes/report-pdf-constants"
import {
  buildReportTemplateContext,
  type BuildReportTemplateContextInput,
} from "@/lib/reportes/report-template-context-registry"

const PAGE_MARGIN = 48

type PdfDoc = InstanceType<typeof PDFDocument>

export interface BuildReportSchemaPdfKitInput {
  reportKey: string
  reportName: string
  reportDescription?: string
  rows: ReportRuntimeRow[]
  totalCount: number
  appliedFilters: Record<string, string>
  clientName: string
  generatedAt: string
  schema: ReportSchema
  extras?: Record<string, unknown> | null
}

export function buildReportSchemaPdfKitBuffer(
  input: BuildReportSchemaPdfKitInput
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margin: PAGE_MARGIN,
      autoFirstPage: true,
      bufferPages: true,
    })

    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    try {
      const contextInput: BuildReportTemplateContextInput = {
        reportKey: input.reportKey,
        reportName: input.reportName,
        reportDescription: input.reportDescription,
        rows: input.rows,
        totalCount: input.totalCount,
        appliedFilters: input.appliedFilters,
        clientName: input.clientName,
        generatedAt: input.generatedAt,
        extras: input.extras ?? null,
      }

      const ctx = buildReportTemplateContext(contextInput)
      renderReportSchemaToPdfKit(doc, input.schema, ctx)
      applyBufferedPageFooters(doc, reportPdfTemplateVersion(input.reportKey))
      doc.end()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}
