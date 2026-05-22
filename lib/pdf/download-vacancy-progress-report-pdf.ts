import { getApiErrorMessage } from "@/lib/api-error"

/** Endpoint relativo de la API Next que genera el PDF con Chromium. */
export const VACANCY_PROGRESS_REPORT_PDF_ENDPOINT =
  "/api/recruiter/reportes/vacancy-progress-by-client/pdf"

export interface DownloadVacancyProgressReportPdfOptions {
  /** HTML ya interpolado del reporte (fragmento `<style>` + `<main>`). */
  previewHtml: string
  /** Nombre base sin extensión; el servidor agrega `.pdf`. */
  fileBaseName?: string | null
}

/**
 * Descarga el PDF del reporte "Estado de vacantes y candidatos".
 * El PDF se genera server-side con Chromium (Puppeteer) sobre el HTML del preview.
 */
export async function downloadVacancyProgressReportPdf(
  options: DownloadVacancyProgressReportPdfOptions
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error(
      "downloadVacancyProgressReportPdf solo puede ejecutarse en el cliente."
    )
  }

  const previewHtml = options.previewHtml?.trim() ?? ""
  if (previewHtml === "") {
    throw new Error("No hay HTML del reporte para descargar el PDF.")
  }

  const response = await fetch(VACANCY_PROGRESS_REPORT_PDF_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      previewHtml,
      fileBaseName: options.fileBaseName ?? null,
    }),
  })

  if (!response.ok) {
    let message = `Error ${response.status}`
    try {
      const payload = await response.json()
      const parsed = getApiErrorMessage(payload)
      if (parsed) message = parsed
    } catch {
      /* Falla parseo JSON: dejamos el mensaje por status */
    }
    const err = new Error(message) as Error & { status: number }
    err.status = response.status
    throw err
  }

  const blob = await response.blob()
  const fallbackName = (options.fileBaseName ?? "").trim() || "reporte"
  const filename = fallbackName.toLowerCase().endsWith(".pdf")
    ? fallbackName
    : `${fallbackName}.pdf`

  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = filename
    anchor.rel = "noopener"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
