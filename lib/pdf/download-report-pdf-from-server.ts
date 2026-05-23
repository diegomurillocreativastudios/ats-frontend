import { getApiErrorMessage } from "@/lib/api-error"

/**
 * Mapa estable `reportType -> endpoint del servidor`. Cada endpoint debe
 * aceptar un POST con `{ previewHtml, fileBaseName, reportType, rows, summary }`
 * y responder `application/pdf` (o un JSON con `message` en caso de error).
 */
export const REPORT_PDF_SERVER_ENDPOINTS: Record<string, string> = {
  "vacancy-progress-by-client":
    "/api/recruiter/reportes/vacancy-progress-by-client/pdf",
}

export interface DownloadReportPdfFromServerInput {
  /** Identificador del reporte; debe existir en `REPORT_PDF_SERVER_ENDPOINTS`. */
  reportType: string
  /** Fragmento HTML interpolado del reporte (vista previa real). */
  previewHtml: string
  /** Filas crudas del reporte (para que el servidor pueda reconstruir si Chromium falla). */
  rows: unknown[]
  /** Resumen estructurado (totales, periodo, cliente, etc.). */
  summary?: Record<string, unknown> | null
  /** Nombre base sin extensión; el servidor agrega `.pdf` si no lo trae. */
  fileBaseName?: string | null
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

/**
 * Descarga el PDF de un reporte llamando al endpoint server-side correspondiente.
 *
 * El servidor renderiza el HTML real con Chromium/Puppeteer y, si Chromium falla,
 * reconstruye un PDF formal con PDFKit a partir de `rows` y `summary`. El cliente
 * NUNCA convierte la vista previa en imagen (no html2canvas, no jsPDF).
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

  const previewHtml = input.previewHtml?.trim() ?? ""
  if (previewHtml === "") {
    throw new Error("No hay HTML de vista previa para generar el PDF.")
  }

  const payload = {
    previewHtml,
    fileBaseName: input.fileBaseName ?? null,
    reportType,
    rows: Array.isArray(input.rows) ? input.rows : [],
    summary: input.summary ?? null,
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(
      "[Report PDF] Calling server endpoint",
      endpoint,
      `(previewHtml=${previewHtml.length} bytes, rows=${payload.rows.length})`
    )
  }

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
    if (process.env.NODE_ENV !== "production") {
      console.error("[Report PDF] Server error", response.status, message)
    }
    throw err
  }

  if (!contentType.toLowerCase().includes("application/pdf")) {
    const message = await extractJsonErrorMessage(response)
    const err = new Error(
      message || `Respuesta inesperada del servidor (${contentType}).`
    ) as DownloadReportPdfServerError
    err.status = response.status
    if (process.env.NODE_ENV !== "production") {
      console.error("[Report PDF] Unexpected content-type", contentType, message)
    }
    throw err
  }

  const blob = await response.blob()
  triggerBlobDownload(blob, buildFileName(input.fileBaseName))
}
