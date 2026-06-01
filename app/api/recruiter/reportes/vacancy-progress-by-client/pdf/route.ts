/**
 * PDF del reporte "Avance de vacantes por cliente".
 * Delega al handler genérico por reportKey (compatibilidad de URL existente).
 */
import { handleReportPdfPost } from "@/lib/reportes/handle-report-pdf-post"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 180

const REPORT_KEY = "vacancy-progress-by-client"

export async function POST(request: Request): Promise<Response> {
  return handleReportPdfPost(REPORT_KEY, request)
}
