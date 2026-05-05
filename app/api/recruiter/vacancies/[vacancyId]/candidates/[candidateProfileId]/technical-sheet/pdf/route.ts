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

export const runtime = "nodejs"

export async function GET(
  _request: Request,
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
    const backendResponse = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const raw = await backendResponse.json().catch(() => null)

    if (!backendResponse.ok) {
      const message =
        getApiErrorMessage(raw) ||
        getApiErrorMessage(backendResponse.statusText) ||
        "No se pudo obtener la ficha técnica"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const payload = normalizeTechnicalSheetPayload(raw)
    const buffer = await buildTechnicalSheetPdfKitBuffer(payload)

    const filenameAscii = `ficha-tecnica-${cid.slice(0, 8)}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameAscii}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e: unknown) {
    console.error("[technical-sheet-pdf]", e)
    return NextResponse.json({ message: "Error al generar el PDF" }, { status: 500 })
  }
}
