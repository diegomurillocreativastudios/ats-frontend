import { getApiErrorMessage } from "@/lib/api-error"
import {
  REPORT_PDF_ENGINE,
  reportPdfTemplateVersion,
} from "@/lib/reportes/report-pdf-constants"
import { supportsSchemaReportPipeline } from "@/lib/reportes/report-template-context-registry"

/**
 * Endpoint POST del servidor para generar PDF de un reporte del catálogo.
 */
export function getReportPdfServerEndpoint(reportType: string): string {
  const key = reportType.trim()
  return `/api/recruiter/reportes/${encodeURIComponent(key)}/pdf`
}

export interface DownloadReportPdfFromServerInput {
  /** Identificador del reporte (`reportKey` del catálogo). */
  reportType: string
  /** Filas crudas del reporte renderizado en pantalla. */
  rows: unknown[]
  /** Resumen estructurado (totales, periodo, cliente, etc.). */
  summary?: Record<string, unknown> | null
  /** Alias opcional de summary para compatibilidad con el endpoint. */
  metadata?: Record<string, unknown> | null
  /**
   * Campos adicionales del payload del endpoint de datos (por ejemplo
   * `summary`/`aiComparison`) que el builder server-side puede necesitar para
   * hidratar el contexto del schema.
   */
  extras?: Record<string, unknown> | null
  /** Total de registros según la vista previa actual. */
  totalCount?: number | null
  /** Nombre base sin extensión; el servidor agrega `.pdf` si no lo trae. */
  fileBaseName?: string | null
  /** Id de la plantilla del reporte (Document template en backend). */
  templateId?: string | number | null
  /** Nombre visible del reporte (catálogo). */
  reportName?: string | null
  /** Descripción del reporte. */
  reportDescription?: string | null
  /** Filtros aplicados en la vista (para contexto PDF). */
  appliedFilters?: Record<string, string> | null
  /** Etiqueta de cliente resuelta en UI. */
  clientName?: string | null
  /** Fecha de generación mostrada en el PDF. */
  generatedAt?: string | null
}

export interface DownloadReportPdfServerError extends Error {
  status: number
}

function buildFileName(baseName: string | null | undefined): string {
  const fallback = "reporte"
  const safe = (baseName ?? "").trim() || fallback
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = fileName
    anchor.rel = "noopener"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function extractJsonErrorMessage(
  response: Response
): Promise<string> {
  try {
    const text = await response.text()
    if (text.trim() === "") return `Error del servidor ${response.status}`
    try {
      const parsed = JSON.parse(text) as unknown
      const fromJson = getApiErrorMessage(parsed)
      if (fromJson) return fromJson
    } catch {
      return text.slice(0, 500)
    }
    return `Error del servidor ${response.status}`
  } catch {
    return `Error del servidor ${response.status}`
  }
}

function assertReportPdfHeaders(
  response: Response,
  expectedRowsCount: number,
  reportType: string
): void {
  const engine = response.headers.get("X-Report-Pdf-Engine") ?? ""
  const templateVersion =
    response.headers.get("X-Report-Pdf-Template-Version") ?? ""
  const rowsCountHeader = response.headers.get("X-Report-Rows-Count") ?? ""
  const reportKeyHeader = response.headers.get("X-Report-Key") ?? ""

  const expectedVersion = reportPdfTemplateVersion(reportType)

  console.info("[Report PDF] response headers", {
    engine,
    templateVersion,
    rowsCount: rowsCountHeader,
    reportKey: reportKeyHeader,
  })

  if (engine !== REPORT_PDF_ENGINE) {
    throw new Error(
      `Motor PDF inesperado: "${engine}". Se esperaba "${REPORT_PDF_ENGINE}".`
    )
  }

  if (templateVersion !== expectedVersion) {
    throw new Error(
      `Versión de plantilla inesperada: "${templateVersion}". Se esperaba "${expectedVersion}".`
    )
  }

  if (reportKeyHeader && reportKeyHeader !== reportType.trim()) {
    throw new Error(
      `ReportKey inconsistente: servidor=${reportKeyHeader}, cliente=${reportType}.`
    )
  }

  if (rowsCountHeader !== String(expectedRowsCount)) {
    throw new Error(
      `Cantidad de filas inconsistente: servidor=${rowsCountHeader}, cliente=${expectedRowsCount}.`
    )
  }
}

/**
 * Descarga el PDF de un reporte llamando al endpoint server-side correspondiente.
 */
export async function downloadReportPdfFromServer(
  input: DownloadReportPdfFromServerInput
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error(
      "downloadReportPdfFromServer solo puede ejecutarse en el cliente."
    )
  }

  const reportType = input.reportType.trim()
  if (!supportsSchemaReportPipeline(reportType)) {
    throw new Error(`Reporte sin pipeline PDF configurado: ${reportType}`)
  }

  const endpoint = getReportPdfServerEndpoint(reportType)
  const rows = Array.isArray(input.rows) ? input.rows : []
  const summary = input.summary ?? input.metadata ?? null

  const payload = {
    fileBaseName: input.fileBaseName ?? null,
    reportType,
    rows,
    summary,
    metadata: input.metadata ?? summary,
    extras: input.extras ?? null,
    totalCount: input.totalCount ?? rows.length,
    templateId: input.templateId ?? null,
    reportName: input.reportName ?? null,
    reportDescription: input.reportDescription ?? null,
    appliedFilters: input.appliedFilters ?? null,
    clientName: input.clientName ?? null,
    generatedAt: input.generatedAt ?? null,
  }

  console.info("[Report PDF] client payload", {
    reportType,
    rowsCount: rows.length,
    totalCount: payload.totalCount,
    endpoint,
  })

  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/pdf" },
    body: JSON.stringify(payload),
  })

  const contentType = response.headers.get("content-type") ?? ""

  if (!response.ok) {
    const message = await extractJsonErrorMessage(response)
    const err = new Error(message) as DownloadReportPdfServerError
    err.status = response.status
    console.error("[Report PDF] Server error", response.status, message)
    throw err
  }

  if (!contentType.toLowerCase().includes("application/pdf")) {
    const message = await extractJsonErrorMessage(response)
    const err = new Error(
      message || `Respuesta inesperada del servidor (${contentType}).`
    ) as DownloadReportPdfServerError
    err.status = response.status
    console.error("[Report PDF] Unexpected content-type", contentType, message)
    throw err
  }

  assertReportPdfHeaders(response, rows.length, reportType)

  const blob = await response.blob()
  triggerBlobDownload(blob, buildFileName(input.fileBaseName))
}

/** @deprecated Usar `getReportPdfServerEndpoint`. */
export const REPORT_PDF_SERVER_ENDPOINTS: Record<string, string> = {
  "vacancy-progress-by-client": getReportPdfServerEndpoint(
    "vacancy-progress-by-client"
  ),
  "candidate-status-by-stage": getReportPdfServerEndpoint(
    "candidate-status-by-stage"
  ),
  "technical-evaluations": getReportPdfServerEndpoint("technical-evaluations"),
  "recruitment-sources": getReportPdfServerEndpoint("recruitment-sources"),
  "preliminary-match-scores": getReportPdfServerEndpoint(
    "preliminary-match-scores"
  ),
  "recruiter-productivity": getReportPdfServerEndpoint("recruiter-productivity"),
  "salary-expectations": getReportPdfServerEndpoint("salary-expectations"),
}
