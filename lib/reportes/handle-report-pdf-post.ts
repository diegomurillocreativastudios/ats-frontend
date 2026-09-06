import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import type { ReportRuntimeRow } from "@/lib/api/recruiter-report-runtime"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import { formatGeneratedAtForPdf } from "@/lib/reportes/executive-summary-metrics"
import {
  FetchReportForServerError,
  fetchReportForServer,
} from "@/lib/reportes/fetch-report-for-server"
import { safeParseReportSchema } from "@/lib/reportes/schema/report-schema"
import { supportsSchemaReportPipeline } from "@/lib/reportes/report-template-context-registry"
import {
  buildReportPdfFilename,
  renderReportPdfBuffer,
  ReportPdfError,
} from "@/lib/reportes/render-report-pdf-buffer"
import {
  assertTechnicalSheetPdfRateLimit,
  TechnicalSheetPdfRateLimitError,
} from "@/lib/technical-sheet/pdf-chromium-concurrency"
import { REPORT_PDF_MAX_ROWS } from "@/lib/technical-sheet/pdf-chromium-limits"
import { fetchTemplatesListForServer } from "@/lib/templates/fetch-templates-for-server"
import {
  findReportDocumentTemplate,
  findReportDocumentTemplateById,
} from "@/lib/templates/technical-sheet-template"

/**
 * Body mínimo del cliente. Filas / summary / extras / HTML se ignoran
 * (FE-SEC-015: datos autoritativos server-side).
 */
export interface ReportPdfRequestBody {
  fileBaseName?: unknown
  templateId?: unknown
  appliedFilters?: unknown
  /** @deprecated Ignorado; el servidor vuelve a pedir las filas al backend. */
  rows?: unknown
  /** @deprecated Ignorado. */
  summary?: unknown
  /** @deprecated Ignorado. */
  metadata?: unknown
  /** @deprecated Ignorado. */
  extras?: unknown
  /** @deprecated Ignorado. */
  totalCount?: unknown
  /** @deprecated Ignorado. */
  clientName?: unknown
  /** @deprecated Ignorado. */
  generatedAt?: unknown
  /** @deprecated Ignorado. */
  reportName?: unknown
  /** @deprecated Ignorado. */
  reportDescription?: unknown
  /** @deprecated Ignorado. */
  previewHtml?: unknown
  /** @deprecated Ignorado. */
  reportType?: unknown
}

function jsonError(
  message: string,
  status: number,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json({ message }, { status, headers })
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

function resolvePdfQuotaKey(accessToken: string): string {
  return `token:${accessToken.slice(0, 16)}`
}

/**
 * Etiqueta de cliente desde datos autoritativos (extras o primera fila).
 */
function resolveClientNameFromAuthoritative(
  rows: ReportRuntimeRow[],
  extras: Record<string, unknown> | null
): string {
  const fromExtras =
    extras && typeof extras.clientName === "string"
      ? extras.clientName.trim()
      : ""
  if (fromExtras) return fromExtras

  const summary = extras?.summary
  if (summary != null && typeof summary === "object" && !Array.isArray(summary)) {
    const name = (summary as Record<string, unknown>).clientName
    if (typeof name === "string" && name.trim() !== "") return name.trim()
  }

  const first = rows[0]
  if (first) {
    const client =
      typeof first.clientName === "string" ? first.clientName.trim() : ""
    if (client) return client
    const company =
      typeof first.companyName === "string" ? first.companyName.trim() : ""
    if (company) return company
  }

  return "Todos"
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

    assertTechnicalSheetPdfRateLimit(resolvePdfQuotaKey(accessToken))

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

    const appliedFilters = coerceFilters(body.appliedFilters)
    const templateIdRaw = body.templateId
    const templateId =
      typeof templateIdRaw === "string" || typeof templateIdRaw === "number"
        ? String(templateIdRaw).trim()
        : ""
    const fileBaseName = coerceString(body.fileBaseName) || null

    const reportData = await fetchReportForServer(
      baseUrl,
      accessToken,
      key,
      appliedFilters
    )
    const { rows, totalCount, extras } = reportData

    if (rows.length === 0) {
      return jsonError(
        "No hay filas para generar el PDF. Aplicá filtros con resultados.",
        400
      )
    }

    if (rows.length > REPORT_PDF_MAX_ROWS) {
      return jsonError(
        `El PDF no puede incluir más de ${REPORT_PDF_MAX_ROWS} filas. Reducí el resultado con filtros.`,
        413
      )
    }

    console.info("[Report PDF] authoritative rows", {
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

    const reportName = template.name?.trim() || key
    const clientName = resolveClientNameFromAuthoritative(rows, extras)
    const generatedAt = formatGeneratedAtForPdf()

    const { buffer, engine, templateVersion } = await renderReportPdfBuffer({
      reportKey: key,
      reportName,
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
    if (e instanceof TechnicalSheetPdfRateLimitError) {
      return jsonError(e.message, 429, {
        "Retry-After": String(e.retryAfterSec),
      })
    }
    if (e instanceof FetchReportForServerError) {
      return jsonError(e.message, e.status)
    }
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
