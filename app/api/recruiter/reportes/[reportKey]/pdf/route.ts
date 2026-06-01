/**
 * PDF genérico para reportes del catálogo (schema JSON + PDFKit).
 * Misma lógica que vacancy-progress-by-client, parametrizada por `reportKey`.
 */
import { handleReportPdfPost } from "@/lib/reportes/handle-report-pdf-post"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 180

interface RouteContext {
  params: Promise<{ reportKey: string }>
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<Response> {
  const { reportKey } = await context.params
  return handleReportPdfPost(reportKey ?? "", request)
}
