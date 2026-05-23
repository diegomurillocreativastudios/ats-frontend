/**
 * PDF del reporte "Avance de vacantes por cliente".
 *
 * Pipeline:
 *  1. Chromium (Puppeteer) renderiza el HTML real recibido como `previewHtml`.
 *  2. Si Chromium falla, PDFKit reconstruye un PDF formal con `rows + summary`.
 *  3. NUNCA respondemos 500 si podemos devolver un PDF fallback.
 *
 * Sólo cuando ambos motores fallan respondemos error JSON.
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import type { VacancyProgressReportPdfKitSummary } from "@/lib/reportes/build-vacancy-progress-report-pdfkit-buffer"
import {
  buildVacancyProgressReportPdfFilename,
  renderVacancyProgressReportPdfBuffer,
  VacancyProgressReportPdfError,
} from "@/lib/reportes/render-vacancy-progress-report-pdf-buffer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 180

interface VacancyProgressReportPdfRequestBody {
  previewHtml?: unknown
  fileBaseName?: unknown
  reportType?: unknown
  rows?: unknown
  summary?: unknown
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
  console.info("[Report PDF] Starting server PDF generation")

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

    const previewHtml = coerceString(body.previewHtml)
    const fileBaseName = coerceString(body.fileBaseName) || null
    const rows = coerceRows(body.rows)
    const summary = coerceSummary(body.summary)

    console.info("[Report PDF] previewHtml length", previewHtml.length)
    console.info("[Report PDF] rows count", rows.length)

    if (previewHtml.trim() === "") {
      return jsonError(
        "Falta el HTML del reporte para generar el PDF.",
        400
      )
    }

    if (rows.length === 0 && summary == null) {
      console.warn(
        "[Report PDF] No rows nor summary received; fallback PDFKit would be empty if Chromium fails."
      )
    }

    const { buffer, engine } = await renderVacancyProgressReportPdfBuffer({
      previewHtml,
      rows,
      summary,
      fileBaseName,
    })

    const filename = buildVacancyProgressReportPdfFilename(fileBaseName)
    console.info(
      "[Report PDF] Returning application/pdf",
      `(engine=${engine}, bytes=${buffer.length}, file=${filename})`
    )

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Report-Pdf-Engine": engine,
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
