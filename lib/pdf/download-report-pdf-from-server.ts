import { getApiErrorMessage } from "@/lib/api-error"
import {
  VACANCY_PROGRESS_PDF_ENGINE,
  VACANCY_PROGRESS_PDF_TEMPLATE_VERSION,
} from "@/lib/reportes/vacancy-progress-pdf-constants"

/**
 * Mapa estable `reportType -> endpoint del servidor`. Cada endpoint debe
 * aceptar un POST con `{ rows, summary, metadata, totalCount, fileBaseName }`
 * y responder `application/pdf` con headers de validación PDFKit v2.
 */
export const REPORT_PDF_SERVER_ENDPOINTS: Record<string, string> = {
  "vacancy-progress-by-client":
    "/api/recruiter/reportes/vacancy-progress-by-client/pdf",
}

export interface DownloadReportPdfFromServerInput {
  /** Identificador del reporte; debe existir en `REPORT_PDF_SERVER_ENDPOINTS`. */
  reportType: string
  /** Filas crudas del reporte renderizado en pantalla. */
  rows: unknown[]
  /** Resumen estructurado (totales, periodo, cliente, etc.). */
  summary?: Record<string, unknown> | null
  /** Alias opcional de summary para compatibilidad con el endpoint. */
  metadata?: Record<string, unknown> | null
  /** Total de registros según la vista previa actual. */
  totalCount?: number | null
  /** Nombre base sin extensión; el servidor agrega `.pdf` si no lo trae. */
  fileBaseName?: string | null
  /** Id de la plantilla del reporte (Document template en backend). */
  templateId?: string | number | null
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
    if (text.trim() === "") return `Error ${response.status}`
    try {
      const parsed = JSON.parse(text) as unknown
      const fromJson = getApiErrorMessage(parsed)
      if (fromJson) return fromJson
    } catch {
      return text.slice(0, 500)
    }
    return `Error ${response.status}`
  } catch {
    return `Error ${response.status}`
  }
}

function assertPdfKitV2Headers(response: Response, expectedRowsCount: number): void {
  const engine = response.headers.get("X-Report-Pdf-Engine") ?? ""
  const templateVersion =
    response.headers.get("X-Report-Pdf-Template-Version") ?? ""
  const rowsCountHeader = response.headers.get("X-Report-Rows-Count") ?? ""

  console.info("[Report PDF] response headers", {
    engine,
    templateVersion,
    rowsCount: rowsCountHeader,
  })

  if (engine !== VACANCY_PROGRESS_PDF_ENGINE) {
    throw new Error(
      `Motor PDF inesperado: "${engine}". Se esperaba "${VACANCY_PROGRESS_PDF_ENGINE}".`
    )
  }

  if (templateVersion !== VACANCY_PROGRESS_PDF_TEMPLATE_VERSION) {
    throw new Error(
      `Versión de plantilla inesperada: "${templateVersion}". Se esperaba "${VACANCY_PROGRESS_PDF_TEMPLATE_VERSION}".`
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
 * Valida que la respuesta provenga del pipeline PDFKit v2 completo.
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
  const endpoint = REPORT_PDF_SERVER_ENDPOINTS[reportType]
  if (!endpoint) {
    throw new Error(`Reporte sin endpoint PDF configurado: ${reportType}`)
  }

  const rows = Array.isArray(input.rows) ? input.rows : []
  const summary = input.summary ?? input.metadata ?? null

  const payload = {
    fileBaseName: input.fileBaseName ?? null,
    reportType,
    rows,
    summary,
    metadata: input.metadata ?? summary,
    totalCount: input.totalCount ?? rows.length,
    templateId: input.templateId ?? null,
  }

  console.info("[Report PDF] client payload", {
    reportType,
    rowsCount: rows.length,
    totalCount: payload.totalCount,
    summary,
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

  assertPdfKitV2Headers(response, rows.length)

  const blob = await response.blob()
  triggerBlobDownload(blob, buildFileName(input.fileBaseName))
}
