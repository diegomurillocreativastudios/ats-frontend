/**
 * PDF del reporte "Avance de vacantes por cliente".
 *
 * Pipeline único: PDFKit v2 completo a partir de `rows`, `summary` y `metadata`.
 * No usa Chromium, Puppeteer, previewHtml ni fallback legacy.
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import type { VacancyProgressReportPdfKitSummary } from "@/lib/reportes/build-vacancy-progress-report-pdfkit-buffer"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import {
  buildVacancyProgressReportPdfFilename,
  renderVacancyProgressReportPdfBuffer,
  VACANCY_PROGRESS_PDF_TEMPLATE_VERSION,
  VacancyProgressReportPdfError,
} from "@/lib/reportes/render-vacancy-progress-report-pdf-buffer"
import { safeParseReportSchema } from "@/lib/reportes/schema/report-schema"
import { fetchTemplatesListForServer } from "@/lib/templates/fetch-templates-for-server"
import {
  findReportDocumentTemplate,
  findReportDocumentTemplateById,
} from "@/lib/templates/technical-sheet-template"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 180

interface VacancyProgressReportPdfRequestBody {
  previewHtml?: unknown
  fileBaseName?: unknown
  reportType?: unknown
  rows?: unknown
  summary?: unknown
  metadata?: unknown
  totalCount?: unknown
  templateId?: unknown
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status })
}

function coerceRows(raw: unknown): VacancyProgressByClientRow[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (row): row is VacancyProgressByClientRow =>
      row != null && typeof row === "object"
  )
}

function coerceSummary(raw: unknown): VacancyProgressReportPdfKitSummary | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null
  return raw as VacancyProgressReportPdfKitSummary
}

function coerceString(raw: unknown): string {
  return typeof raw === "string" ? raw : ""
}

export async function POST(request: Request): Promise<NextResponse> {
  console.info("[Report PDF] Starting server PDF generation (pdfkit-v2)")

  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
    if (!accessToken) {
      return jsonError("No autorizado", 401)
    }

    const body = (await request.json().catch(() => null)) as
      | VacancyProgressReportPdfRequestBody
      | null

    if (body == null || typeof body !== "object") {
      return jsonError("Body inválido para generar el PDF del reporte.", 400)
    }

    const baseUrl = getServerBackendBaseUrl()
    if (!baseUrl) {
      return jsonError(
        "El servicio no está configurado. Definí NEXT_PUBLIC_API_URL, API_URL o BACKEND_URL.",
        500
      )
    }

    const fileBaseName = coerceString(body.fileBaseName) || null
    const rows = coerceRows(body.rows)
    const summaryFromBody = coerceSummary(body.summary)
    const metadata = coerceSummary(body.metadata)
    const summary = summaryFromBody ?? metadata
    const templateIdRaw = body.templateId
    const templateId =
      typeof templateIdRaw === "string" || typeof templateIdRaw === "number"
        ? String(templateIdRaw).trim()
        : ""

    if (summary && body.totalCount != null && summary.totalCount == null) {
      summary.totalCount = body.totalCount as VacancyProgressReportPdfKitSummary["totalCount"]
    }

    console.info("[Report PDF] server received", {
      rowsCount: rows.length,
      totalCount: body.totalCount,
      summary,
      engine: "pdfkit-v2",
      templateVersion: VACANCY_PROGRESS_PDF_TEMPLATE_VERSION,
    })

    const templates = await fetchTemplatesListForServer(baseUrl, accessToken)
    const template = templateId
      ? findReportDocumentTemplateById(templates, templateId)
      : findReportDocumentTemplate(templates)

    if (!template) {
      return jsonError(
        "No se encontró una plantilla de reporte válida para generar el PDF.",
        404
      )
    }

    const parsedSchema = safeParseReportSchema(template.contentTemplate)
    if (parsedSchema.success === false) {
      return NextResponse.json(
        {
          message: "La plantilla del reporte no es un JSON válido",
          error: parsedSchema.error,
        },
        { status: 400 }
      )
    }

    const { buffer, engine, templateVersion } = await renderVacancyProgressReportPdfBuffer({
      rows,
      summary,
      metadata,
      fileBaseName,
      schema: parsedSchema.data,
    })

    const filename = buildVacancyProgressReportPdfFilename(fileBaseName)
    console.info("[Report PDF] Returning application/pdf", {
      engine,
      templateVersion,
      bytes: buffer.length,
      file: filename,
      rowsCount: rows.length,
    })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Report-Pdf-Engine": engine,
        "X-Report-Pdf-Template-Version": templateVersion,
        "X-Report-Rows-Count": String(rows.length),
      },
    })
  } catch (e: unknown) {
    console.error(
      "[Report PDF] Unrecoverable error generating PDF",
      e instanceof Error ? e.stack ?? e.message : e
    )
    if (e instanceof VacancyProgressReportPdfError) {
      return jsonError(e.message, e.status)
    }
    const errWithStatus = e as Error & { status?: number }
    const status =
      typeof errWithStatus.status === "number" &&
      errWithStatus.status >= 400 &&
      errWithStatus.status < 600
        ? errWithStatus.status
        : 500
    const message =
      status !== 500 && errWithStatus.message
        ? errWithStatus.message
        : "Error al generar el PDF del reporte"
    return jsonError(message, status)
  }
}
