/**
 * PDF de ficha técnica: por defecto Chromium (`page.pdf`) sobre el mismo HTML que el modal.
 * Rollback temporal PDFKit: `?engine=pdfkit` o `TECHNICAL_SHEET_PDF_ENGINE=pdfkit`.
 * No se acepta HTML arbitrario del cliente; solo datos del backend + plantilla.
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
import { buildTechnicalSheetPdfKitBuffer } from "@/lib/technical-sheet/build-technical-sheet-pdfkit"
import { renderPaginatedTechnicalSheetPdfFromInterpolated } from "@/lib/technical-sheet/technical-sheet-pdf-render-paginated"
import { buildVisibleLogoUrlForTechnicalSheet } from "@/lib/technical-sheet/server-public-app-url"
import { tryLoadVisibleLogoDataUriForTechnicalSheetPdf } from "@/lib/technical-sheet/technical-sheet-pdf-logo"
import { resolveTechnicalSheetPdfEngine } from "@/lib/technical-sheet/technical-sheet-pdf-engine"
import {
  buildTechnicalSheetTemplateContext,
  renderTechnicalSheetHtml,
} from "@/lib/technical-sheet/template-interpolate"
import { findTechnicalSheetDocumentTemplate } from "@/lib/templates/technical-sheet-template"
import { fetchTemplatesListForServer } from "@/lib/templates/fetch-templates-for-server"
import { technicalSheetMessages as m } from "@/lib/messages/technical-sheet"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(
  request: Request,
  context: { params: Promise<{ vacancyId: string; candidateProfileId: string }> }
) {
  try {
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
    const filenameAscii = `ficha-tecnica-${cid.slice(0, 8)}.pdf`

    if (engine === "pdfkit") {
      const buffer = await buildTechnicalSheetPdfKitBuffer(payload)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filenameAscii}"`,
          "Cache-Control": "no-store",
        },
      })
    }

    const picked = findTechnicalSheetDocumentTemplate(templates)
    const rawTemplate = picked?.contentTemplate?.trim() ?? ""
    if (!picked || rawTemplate === "") {
      return NextResponse.json({ message: m.errorNoTechnicalSheetTemplate }, { status: 400 })
    }

    let vacancyTitleFallback: string | null = null
    try {
      const url = new URL(request.url)
      const q = url.searchParams.get("vacancyTitle")?.trim()
      if (q) vacancyTitleFallback = q
    } catch {
      /* ignore */
    }

    const logoDataUri = tryLoadVisibleLogoDataUriForTechnicalSheetPdf()
    const logoFallbackUrl = buildVisibleLogoUrlForTechnicalSheet()
    const logoUrl = logoDataUri ?? (logoFallbackUrl.trim() !== "" ? logoFallbackUrl : null)
    const ctx = buildTechnicalSheetTemplateContext(payload, {
      vacancyTitleFallback,
      logoUrl,
    })
    const innerHtml = renderTechnicalSheetHtml(rawTemplate, ctx)
    const headerRecord = ctx.header as Record<string, unknown> | undefined
    const header = {
      fullName: String(headerRecord?.fullName ?? ""),
      address: String(headerRecord?.address ?? ""),
      englishLevel: String(headerRecord?.englishLevel ?? ""),
    }
    let buffer: Buffer
    try {
      buffer = await renderPaginatedTechnicalSheetPdfFromInterpolated(
        innerHtml,
        header,
        String(ctx.logoUrl ?? "")
      )
    } catch (chromiumErr) {
      const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
      const disablePdfKitFallback =
        process.env.TECHNICAL_SHEET_PDF_DISABLE_VERCEL_PDFKIT_FALLBACK === "1"
      if (!onVercel || disablePdfKitFallback) throw chromiumErr
      console.error(
        "[technical-sheet-pdf] Chromium PDF failed on Vercel; using PDFKit fallback",
        chromiumErr instanceof Error ? chromiumErr.stack ?? chromiumErr.message : chromiumErr
      )
      buffer = await buildTechnicalSheetPdfKitBuffer(payload)
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameAscii}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e: unknown) {
    console.error("[technical-sheet-pdf]", e instanceof Error ? e.stack ?? e.message : e)
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
    return NextResponse.json({ message }, { status })
  }
}
