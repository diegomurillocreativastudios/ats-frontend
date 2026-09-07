import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  normalizeCandidateDocuments,
  toPublicCandidateDocument,
  type CandidateDocument,
} from "@/lib/candidate-documents"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import {
  getUploadMaxBytesForBackendPath,
  isBoundedBodyTooLarge,
  readRequestBodyWithinLimit,
} from "@/lib/upload-body-limit"

const sortByCreatedAtDesc = (items: CandidateDocument[]) =>
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

    const backendResponse = await fetch(
      `${baseUrl}/api/candidate/${encodeURIComponent(candidateId)}/documents`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    )

    const payload = await backendResponse.json().catch(() => null)

    if (!backendResponse.ok) {
      const message =
        getApiErrorMessage(payload) ||
        getApiErrorMessage(backendResponse.statusText) ||
        "No se pudieron obtener los documentos del candidato"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    const documents = sortByCreatedAtDesc(normalizeCandidateDocuments(payload))
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
    if (isBoundedBodyTooLarge(bounded)) {
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

    const document = toPublicCandidateDocument(payload)
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
