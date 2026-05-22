/**
 * PDF del reporte "Estado de vacantes y candidatos".
 * Generado server-side con Chromium (`page.pdf`) sobre el HTML ya interpolado
 * que envía el cliente desde el preview.
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import {
  buildVacancyProgressReportPdfFilename,
  renderVacancyProgressReportPdfBuffer,
  VacancyProgressReportPdfError,
} from "@/lib/reportes/render-vacancy-progress-report-pdf-buffer"

export const runtime = "nodejs"
export const maxDuration = 180

interface VacancyProgressReportPdfRequestBody {
  previewHtml?: unknown
  fileBaseName?: unknown
}

function pdfErrorResponse(e: unknown): NextResponse {
  console.error(
    "[vacancy-progress-report-pdf]",
    e instanceof Error ? e.stack ?? e.message : e
  )
  if (e instanceof VacancyProgressReportPdfError) {
    return NextResponse.json({ message: e.message }, { status: e.status })
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
  return NextResponse.json({ message }, { status })
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
    if (!accessToken) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as
      | VacancyProgressReportPdfRequestBody
      | null
    const previewHtml =
      body != null && typeof body.previewHtml === "string"
        ? body.previewHtml
        : ""
    const fileBaseName =
      body != null && typeof body.fileBaseName === "string"
        ? body.fileBaseName
        : null

    if (previewHtml.trim() === "") {
      return NextResponse.json(
        { message: "Falta el HTML del reporte para generar el PDF." },
        { status: 400 }
      )
    }

    const buffer = await renderVacancyProgressReportPdfBuffer({ previewHtml })
    const filename = buildVacancyProgressReportPdfFilename(fileBaseName)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e: unknown) {
    return pdfErrorResponse(e)
  }
}
