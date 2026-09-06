import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import {
  getUploadMaxBytesForBackendPath,
  readRequestBodyWithinLimit,
} from "@/lib/upload-body-limit"

interface CandidateDocumentDto {
  id: string
  storagePath: string | null
  createdAt: string | null
  contentSha256: string | null
}

const toStringOrNull = (value: unknown) => {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

const normalizeCandidateDocument = (raw: unknown): CandidateDocumentDto | null => {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const id = toStringOrNull(row.id)
  if (!id) return null

  return {
    id,
    storagePath: toStringOrNull(row.storagePath),
    createdAt: toStringOrNull(row.createdAt),
    contentSha256: toStringOrNull(row.contentSha256),
  }
}

const sortByCreatedAtDesc = (items: CandidateDocumentDto[]) =>
  [...items].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : Number.NEGATIVE_INFINITY
    const bTime = b.createdAt ? Date.parse(b.createdAt) : Number.NEGATIVE_INFINITY
    return bTime - aTime
  })

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const candidateId = String(id ?? "").trim()
    if (!candidateId) {
      return NextResponse.json({ message: "Id de candidato inválido" }, { status: 400 })
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

    const backendResponse = await fetch(`${baseUrl}/api/candidate/${encodeURIComponent(candidateId)}/documents`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    const payload = await backendResponse.json().catch(() => null)

    if (!backendResponse.ok) {
      const message =
        getApiErrorMessage(payload) ||
        getApiErrorMessage(backendResponse.statusText) ||
        "No se pudieron obtener los documentos del candidato"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const listRaw = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as Record<string, unknown> | null)?.items)
        ? ((payload as Record<string, unknown>).items as unknown[])
        : []

    const documents = sortByCreatedAtDesc(
      listRaw
        .map((item) => normalizeCandidateDocument(item))
        .filter((item): item is CandidateDocumentDto => item !== null)
    )

    return NextResponse.json(documents)
  } catch (err: unknown) {
    return NextResponse.json(
      { message: getApiErrorMessage(err) || "Error al obtener documentos del candidato" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const candidateId = String(id ?? "").trim()
    if (!candidateId) {
      return NextResponse.json({ message: "Id de candidato inválido" }, { status: 400 })
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

    const backendPath = `/api/candidate/${encodeURIComponent(candidateId)}/documents`
    const maxBytes = getUploadMaxBytesForBackendPath(backendPath)
    const bounded = await readRequestBodyWithinLimit(request, maxBytes)
    if (!bounded.ok) {
      return NextResponse.json(
        { message: bounded.message },
        { status: bounded.status }
      )
    }
    if (bounded.body.byteLength === 0) {
      return NextResponse.json({ message: "No file uploaded." }, { status: 400 })
    }

    const forwardHeaders = new Headers()
    forwardHeaders.set("Authorization", `Bearer ${accessToken}`)
    const contentType = request.headers.get("content-type")
    if (contentType) {
      forwardHeaders.set("Content-Type", contentType)
    }

    const backendResponse = await fetch(`${baseUrl}${backendPath}`, {
      method: "POST",
      headers: forwardHeaders,
      body: bounded.body,
      cache: "no-store",
    })

    const payload = await backendResponse.json().catch(() => null)
    if (!backendResponse.ok) {
      const message =
        getApiErrorMessage(payload) ||
        getApiErrorMessage(backendResponse.statusText) ||
        "No se pudo subir el documento del candidato"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const document = normalizeCandidateDocument(payload)
    if (!document) {
      return NextResponse.json(
        { message: "Respuesta inválida al subir el documento del candidato" },
        { status: 502 }
      )
    }

    return NextResponse.json(document)
  } catch (err: unknown) {
    return NextResponse.json(
      { message: getApiErrorMessage(err) || "Error al subir el documento del candidato" },
      { status: 500 }
    )
  }
}
