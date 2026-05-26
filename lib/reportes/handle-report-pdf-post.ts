import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import type { ReportRuntimeRow } from "@/lib/api/recruiter-report-runtime"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import { safeParseReportSchema } from "@/lib/reportes/schema/report-schema"
import { supportsSchemaReportPipeline } from "@/lib/reportes/report-template-context-registry"
import {
  buildReportPdfFilename,
  renderReportPdfBuffer,
  ReportPdfError,
} from "@/lib/reportes/render-report-pdf-buffer"
import { fetchTemplatesListForServer } from "@/lib/templates/fetch-templates-for-server"
import {
  findReportDocumentTemplate,
  findReportDocumentTemplateById,
} from "@/lib/templates/technical-sheet-template"

export interface ReportPdfRequestBody {
  previewHtml?: unknown
  fileBaseName?: unknown
  reportType?: unknown
  rows?: unknown
  summary?: unknown
  metadata?: unknown
  extras?: unknown
  totalCount?: unknown
  templateId?: unknown
  reportName?: unknown
  reportDescription?: unknown
  appliedFilters?: unknown
  clientName?: unknown
  generatedAt?: unknown
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status })
}

function coerceRows(raw: unknown): ReportRuntimeRow[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (row): row is ReportRuntimeRow => row != null && typeof row === "object"
  )
}

function coerceSummary(raw: unknown): Record<string, unknown> | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null
  return raw as Record<string, unknown>
}

function coerceString(raw: unknown): string {
  return typeof raw === "string" ? raw : ""
}

function coerceFilters(raw: unknown): Record<string, string> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value == null) {
      out[key] = ""
      continue
    }
    out[key] = String(value)
  }
  return out
}

export async function handleReportPdfPost(
  reportKey: string,
  request: Request
): Promise<NextResponse> {
  const key = reportKey.trim()
  console.info("[Report PDF] Starting server PDF generation", { reportKey: key })

  if (!supportsSchemaReportPipeline(key)) {
    return jsonError(`Reporte sin pipeline PDF schema: ${key}`, 404)
  }

  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
    if (!accessToken) {
      return jsonError("No autorizado", 401)
    }

    const body = (await request.json().catch(() => null)) as
      | ReportPdfRequestBody
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

    const rows = coerceRows(body.rows)
    const summary = coerceSummary(body.summary) ?? coerceSummary(body.metadata)
    const extras = coerceSummary(body.extras)
    const templateIdRaw = body.templateId
    const templateId =
      typeof templateIdRaw === "string" || typeof templateIdRaw === "number"
        ? String(templateIdRaw).trim()
        : ""

    const fileBaseName = coerceString(body.fileBaseName) || null
    const reportName = coerceString(body.reportName) || key
    const reportDescription = coerceString(body.reportDescription) || undefined
    const appliedFilters = coerceFilters(body.appliedFilters)
    const clientName =
      coerceString(body.clientName) ||
      coerceString(summary?.clientName) ||
      "Todos"
    const generatedAt =
      coerceString(body.generatedAt) ||
      coerceString(summary?.generatedAt) ||
      new Date().toLocaleString("es-MX")

    const totalCountRaw = body.totalCount ?? summary?.totalCount
    const totalCount =
      totalCountRaw != null && !Number.isNaN(Number(totalCountRaw))
        ? Number(totalCountRaw)
        : rows.length

    if (rows.length === 0) {
      return jsonError(
        "No hay filas para generar el PDF. Aplicá filtros con resultados.",
        400
      )
    }

    console.info("[Report PDF] server received", {
      reportKey: key,
      rowsCount: rows.length,
      totalCount,
      engine: "pdfkit-schema",
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

    if (
      parsedSchema.data.reportKey &&
      parsedSchema.data.reportKey.trim() !== key
    ) {
      console.warn("[Report PDF] schema reportKey mismatch", {
        expected: key,
        schema: parsedSchema.data.reportKey,
      })
    }

    const { buffer, engine, templateVersion } = await renderReportPdfBuffer({
      reportKey: key,
      reportName,
      reportDescription,
      rows,
      totalCount,
      appliedFilters,
      clientName,
      generatedAt,
      fileBaseName,
      schema: parsedSchema.data,
      extras,
    })

    const filename = buildReportPdfFilename(key, fileBaseName)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Report-Pdf-Engine": engine,
        "X-Report-Pdf-Template-Version": templateVersion,
        "X-Report-Key": key,
        "X-Report-Rows-Count": String(rows.length),
      },
    })
  } catch (e: unknown) {
    console.error(
      "[Report PDF] Unrecoverable error generating PDF",
      e instanceof Error ? e.stack ?? e.message : e
    )
    if (e instanceof ReportPdfError) {
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
