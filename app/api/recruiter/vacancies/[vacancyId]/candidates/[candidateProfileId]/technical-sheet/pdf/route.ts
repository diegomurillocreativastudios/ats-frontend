/**
 * PDF de ficha técnica: Chromium (`page.pdf`) sobre el HTML de la vista previa (POST)
 * o reconstruido en servidor (GET). Rollback PDFKit: `?engine=pdfkit`.
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import {
  buildTechnicalSheetBasePath,
  normalizeTechnicalSheetPayload,
} from "@/lib/api/technical-sheet"
import {
  buildTechnicalSheetPdfFilename,
  renderTechnicalSheetPdfBuffer,
  TechnicalSheetPdfError,
} from "@/lib/technical-sheet/render-technical-sheet-pdf-response"
import { resolveTechnicalSheetPdfEngine } from "@/lib/technical-sheet/technical-sheet-pdf-engine"
import { fetchTemplatesListForServer } from "@/lib/templates/fetch-templates-for-server"

export const runtime = "nodejs"
export const maxDuration = 60

interface PdfRouteContext {
  params: Promise<{ vacancyId: string; candidateProfileId: string }>
}

function readVacancyTitleFallback(request: Request): string | null {
  try {
    const q = new URL(request.url).searchParams.get("vacancyTitle")?.trim()
    return q || null
  } catch {
    return null
  }
}

async function handleTechnicalSheetPdf(
  request: Request,
  context: PdfRouteContext,
  previewHtml: string | null
) {
  const { vacancyId, candidateProfileId } = await context.params
  const vid = String(vacancyId ?? "").trim()
  const cid = String(candidateProfileId ?? "").trim()
  if (!vid || !cid) {
    return NextResponse.json({ message: "Parámetros inválidos" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 })
  }

  const baseUrl = getServerBackendBaseUrl()
  if (!baseUrl) {
    return NextResponse.json(
      {
        message:
          "El servicio no está configurado. Definí NEXT_PUBLIC_API_URL, API_URL o BACKEND_URL.",
      },
      { status: 500 }
    )
  }

  const path = buildTechnicalSheetBasePath(vid, cid)
  const engine = resolveTechnicalSheetPdfEngine(request)

  const [backendResponse, templates] = await Promise.all([
    fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }),
    fetchTemplatesListForServer(baseUrl, accessToken),
  ])

  const raw = await backendResponse.json().catch(() => null)

  if (!backendResponse.ok) {
    const message =
      getApiErrorMessage(raw) ||
      getApiErrorMessage(backendResponse.statusText) ||
      "No se pudo obtener la ficha técnica"
    return NextResponse.json({ message }, { status: backendResponse.status })
  }

  const payload = normalizeTechnicalSheetPayload(raw)
  const filenameAscii = buildTechnicalSheetPdfFilename(cid)

  const buffer = await renderTechnicalSheetPdfBuffer({
    payload,
    templates,
    candidateProfileId: cid,
    vacancyTitleFallback: readVacancyTitleFallback(request),
    previewHtml,
    preferPdfKit: engine === "pdfkit",
  })

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameAscii}"`,
      "Cache-Control": "no-store",
    },
  })
}

function pdfErrorResponse(e: unknown) {
  console.error("[technical-sheet-pdf]", e instanceof Error ? e.stack ?? e.message : e)
  if (e instanceof TechnicalSheetPdfError) {
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
    status !== 500 && errWithStatus.message ? errWithStatus.message : "Error al generar el PDF"
  return NextResponse.json({ message }, { status })
}

export async function GET(request: Request, context: PdfRouteContext) {
  try {
    return await handleTechnicalSheetPdf(request, context, null)
  } catch (e: unknown) {
    return pdfErrorResponse(e)
  }
}

export async function POST(request: Request, context: PdfRouteContext) {
  try {
    const body = (await request.json().catch(() => null)) as { previewHtml?: unknown } | null
    const previewHtml =
      body != null && typeof body.previewHtml === "string" ? body.previewHtml : null
    return await handleTechnicalSheetPdf(request, context, previewHtml)
  } catch (e: unknown) {
    return pdfErrorResponse(e)
  }
}
