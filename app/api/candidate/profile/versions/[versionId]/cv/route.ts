/**
 * PDF del CV adaptado a partir de una versión de perfil (ATS-safe, PDFKit).
 * FE-SEC-015: no acepta HTML ni payload del cliente; relee GET de versions.
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
import { normalizeProfileVersionDetail } from "@/lib/candidate-profile-version"
import {
  buildAdaptedCvPdfBuffer,
  buildAdaptedCvPdfFilename,
} from "@/lib/candidate-cv-pdfkit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

interface CvRouteContext {
  params: Promise<{ versionId: string }>
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

async function handleAdaptedCvPdf(request: Request, context: CvRouteContext) {
  void request
  const { versionId } = await context.params
  const id = String(versionId ?? "").trim()
  if (!id) {
    return jsonWithPrivateNoStore({ message: "Parámetros inválidos" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) {
    return jsonWithPrivateNoStore({ message: "No autorizado" }, { status: 401 })
  }

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

  const versionPath = `/api/candidate/profile/versions/${encodeURIComponent(id)}`
  const versionResult = await fetchBackendJson(baseUrl, versionPath, accessToken)
  if (!versionResult.ok) {
    const message =
      getApiErrorMessage(versionResult.raw) || "No se pudo obtener la versión del perfil"
    return jsonWithPrivateNoStore({ message }, { status: versionResult.status })
  }

  const detail = normalizeProfileVersionDetail(versionResult.raw)
  if (!detail) {
    return jsonWithPrivateNoStore(
      { message: "La versión del perfil no es válida" },
      { status: 422 }
    )
  }

  const buffer = await buildAdaptedCvPdfBuffer(detail.profileSnapshot, {
    vacancyTitle: detail.vacancyTitle,
    versionNumber: detail.versionNumber,
    label: detail.label,
  })
  const filenameAscii = buildAdaptedCvPdfFilename({
    vacancyTitle: detail.vacancyTitle,
    versionNumber: detail.versionNumber,
    label: detail.label,
  })

  return applyPrivateNoStore(
    new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameAscii}"`,
        "Cache-Control": PRIVATE_NO_STORE_CACHE_CONTROL,
      },
    })
  )
}

function cvErrorResponse(e: unknown) {
  logServerError("candidate-adapted-cv-pdf", e)
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
      : "Error al generar el CV adaptado"
  return jsonWithPrivateNoStore({ message }, { status })
}

export async function GET(request: Request, context: CvRouteContext) {
  try {
    return await handleAdaptedCvPdf(request, context)
  } catch (e: unknown) {
    return cvErrorResponse(e)
  }
}
