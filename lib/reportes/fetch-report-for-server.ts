import { getApiErrorMessage } from "@/lib/api-error"
import {
  buildRecruiterReportQuery,
  coerceRecruiterReportResponse,
  RECRUITER_REPORTS_PREFIX,
  type ReportRuntimeResponse,
} from "@/lib/api/recruiter-report-runtime"

export class FetchReportForServerError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "FetchReportForServerError"
    this.status = status
  }
}

/**
 * Carga filas autoritativas del reporte desde el backend (Bearer).
 * No acepta `endpoint` del cliente: siempre `/api/recruiter/reports/<reportKey>`.
 */
export async function fetchReportForServer(
  baseUrl: string,
  accessToken: string,
  reportKey: string,
  filters: Record<string, unknown>
): Promise<ReportRuntimeResponse> {
  const key = reportKey.trim()
  if (!key) {
    throw new FetchReportForServerError("reportKey inválido", 400)
  }

  const root = baseUrl.replace(/\/$/, "")
  const path = `${RECRUITER_REPORTS_PREFIX}/${encodeURIComponent(key)}`
  const query = buildRecruiterReportQuery(filters)
  const url = `${root}${path}${query}`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const raw = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      getApiErrorMessage(raw) ||
      getApiErrorMessage(res.statusText) ||
      `No se pudo cargar el reporte (${res.status})`
    throw new FetchReportForServerError(message, res.status)
  }

  return coerceRecruiterReportResponse(raw)
}
