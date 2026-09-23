/**
 * PDF de ficha técnica desde el perfil del candidato (sin vacante).
 * FE-SEC-015: no acepta HTML ni payload del cliente; relee GET de candidatos.
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { logServerError } from "@/lib/security/safe-server-log"
import {
  applyPrivateNoStore,
  jsonWithPrivateNoStore,
  PRIVATE_NO_STORE_CACHE_CONTROL,
} from "@/lib/security/cache-headers"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import {
  assertTechnicalSheetPdfRateLimit,
  TechnicalSheetPdfBusyError,
  TechnicalSheetPdfRateLimitError,
} from "@/lib/technical-sheet/pdf-chromium-concurrency"
import { buildTechnicalSheetPayloadFromRecruiterApiResponses } from "@/lib/technical-sheet/profile-to-technical-sheet-payload"
import {
  buildTechnicalSheetPdfFilename,
  renderTechnicalSheetPdfBuffer,
  TechnicalSheetPdfError,
} from "@/lib/technical-sheet/render-technical-sheet-pdf-response"
import { resolveTechnicalSheetPdfEngine } from "@/lib/technical-sheet/technical-sheet-pdf-engine"
import { fetchTemplatesListForServer } from "@/lib/templates/fetch-templates-for-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface PdfRouteContext {
  params: Promise<{ candidateId: string }>
}

function resolvePdfQuotaKey(accessToken: string): string {
  return `token:${accessToken.slice(0, 16)}`
}

async function fetchBackendJson(
  baseUrl: string,
  path: string,
  accessToken: string
): Promise<{ ok: boolean; status: number; raw: unknown }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })
  const raw = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, raw }
}

async function handleCandidateProfileTechnicalSheetPdf(
  request: Request,
  context: PdfRouteContext
) {
  const { candidateId } = await context.params
  const cid = String(candidateId ?? "").trim()
  if (!cid) {
    return jsonWithPrivateNoStore({ message: "Parámetros inválidos" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) {
    return jsonWithPrivateNoStore({ message: "No autorizado" }, { status: 401 })
  }

  assertTechnicalSheetPdfRateLimit(resolvePdfQuotaKey(accessToken))

  const baseUrl = getServerBackendBaseUrl()
  if (!baseUrl) {
    return jsonWithPrivateNoStore(
      {
        message:
          "El servicio no está configurado. Definí NEXT_PUBLIC_API_URL, API_URL o BACKEND_URL.",
      },
      { status: 500 }
    )
  }

  const engine = resolveTechnicalSheetPdfEngine(request)
  const detailPath = `/api/recruiter/candidates/${encodeURIComponent(cid)}`
  const profilePath = `/api/recruiter/candidates/${encodeURIComponent(cid)}/profile`

  const [detailResult, profileResult, templates] = await Promise.all([
    fetchBackendJson(baseUrl, detailPath, accessToken),
    fetchBackendJson(baseUrl, profilePath, accessToken).catch(() => ({
      ok: false,
      status: 0,
      raw: null,
    })),
    fetchTemplatesListForServer(baseUrl, accessToken),
  ])

  if (!detailResult.ok) {
    const message =
      getApiErrorMessage(detailResult.raw) ||
      "No se pudo obtener el perfil del candidato"
    return jsonWithPrivateNoStore({ message }, { status: detailResult.status })
  }

  const profileRaw = profileResult.ok ? profileResult.raw : null
  const payload = buildTechnicalSheetPayloadFromRecruiterApiResponses({
    candidateId: cid,
    detailRaw: detailResult.raw,
    profileRaw,
  })

  const filenameAscii = buildTechnicalSheetPdfFilename(cid)
  const buffer = await renderTechnicalSheetPdfBuffer({
    payload,
    templates,
    candidateProfileId: cid,
    vacancyTitleFallback: null,
    engine,
  })

  return applyPrivateNoStore(
    new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameAscii}"`,
        "Cache-Control": PRIVATE_NO_STORE_CACHE_CONTROL,
        "X-Technical-Sheet-Pdf-Engine": engine,
      },
    })
  )
}

function pdfErrorResponse(e: unknown) {
  logServerError("candidate-profile-technical-sheet-pdf", e)
  if (e instanceof TechnicalSheetPdfRateLimitError) {
    return jsonWithPrivateNoStore(
      { message: e.message },
      {
        status: 429,
        headers: { "Retry-After": String(e.retryAfterSec) },
      }
    )
  }
  if (e instanceof TechnicalSheetPdfBusyError) {
    return jsonWithPrivateNoStore(
      { message: e.message },
      {
        status: 503,
        headers: { "Retry-After": "5" },
      }
    )
  }
  if (e instanceof TechnicalSheetPdfError) {
    return jsonWithPrivateNoStore({ message: e.message }, { status: e.status })
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
      : "Error al generar el PDF"
  return jsonWithPrivateNoStore({ message }, { status })
}

export async function GET(request: Request, context: PdfRouteContext) {
  try {
    return await handleCandidateProfileTechnicalSheetPdf(request, context)
  } catch (e: unknown) {
    return pdfErrorResponse(e)
  }
}

/** Alias del GET: no lee body ni HTML del cliente (FE-SEC-015). */
export async function POST(request: Request, context: PdfRouteContext) {
  try {
    return await handleCandidateProfileTechnicalSheetPdf(request, context)
  } catch (e: unknown) {
    return pdfErrorResponse(e)
  }
}
