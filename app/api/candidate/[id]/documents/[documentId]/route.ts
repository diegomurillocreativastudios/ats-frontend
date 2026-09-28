import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  applyPrivateNoStore,
  jsonWithPrivateNoStore,
  PRIVATE_NO_STORE_CACHE_CONTROL,
} from "@/lib/security/cache-headers"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
  "content-range",
  "accept-ranges",
] as const

/**
 * Streams a candidate document by opaque id (FE-SEC-020).
 * Proxies GET /api/candidate/{id}/documents/{documentId} — path resolved on the backend.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await context.params
    const candidateId = String(id ?? "").trim()
    const docId = String(documentId ?? "").trim()
    if (!candidateId || !docId) {
      return jsonWithPrivateNoStore(
        { message: "Parámetros inválidos" },
        { status: 400 }
      )
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

    const backendResponse = await fetch(
      `${baseUrl}/api/candidate/${encodeURIComponent(candidateId)}/documents/${encodeURIComponent(docId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    )

    if (!backendResponse.ok) {
      const errBody = await backendResponse.json().catch(() => null)
      const message =
        getApiErrorMessage(errBody) ||
        getApiErrorMessage(backendResponse.statusText) ||
        "No se pudo descargar el documento"
      return jsonWithPrivateNoStore(
        { message },
        { status: backendResponse.status }
      )
    }

    const responseHeaders = new Headers()
    for (const name of FORWARD_RESPONSE_HEADERS) {
      const value = backendResponse.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }
    responseHeaders.set("Cache-Control", PRIVATE_NO_STORE_CACHE_CONTROL)

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    })
  } catch (err: unknown) {
    return jsonWithPrivateNoStore(
      { message: getApiErrorMessage(err) || "Error al descargar el documento" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await context.params
    const candidateId = String(id ?? "").trim()
    const docId = String(documentId ?? "").trim()
    if (!candidateId || !docId) {
      return jsonWithPrivateNoStore(
        { message: "Parámetros inválidos" },
        { status: 400 }
      )
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

    const backendResponse = await fetch(
      `${baseUrl}/api/candidate/${encodeURIComponent(candidateId)}/documents/${encodeURIComponent(docId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    )

    if (backendResponse.status === 204 || backendResponse.status === 205) {
      return applyPrivateNoStore(
        new NextResponse(null, { status: backendResponse.status })
      )
    }

    const payload = await backendResponse.json().catch(() => null)

    if (!backendResponse.ok) {
      const message =
        getApiErrorMessage(payload) ||
        getApiErrorMessage(backendResponse.statusText) ||
        "No se pudo eliminar el documento del candidato"
      return jsonWithPrivateNoStore(
        { message },
        { status: backendResponse.status }
      )
    }

    return applyPrivateNoStore(new NextResponse(null, { status: 204 }))
  } catch (err: unknown) {
    return jsonWithPrivateNoStore(
      {
        message:
          getApiErrorMessage(err) ||
          "Error al eliminar el documento del candidato",
      },
      { status: 500 }
    )
  }
}
