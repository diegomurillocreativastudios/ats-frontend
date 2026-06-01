import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_COOKIES } from "@/lib/auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await context.params
    const candidateId = String(id ?? "").trim()
    const docId = String(documentId ?? "").trim()
    if (!candidateId || !docId) {
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
      return new NextResponse(null, { status: backendResponse.status })
    }

    const payload = await backendResponse.json().catch(() => null)

    if (!backendResponse.ok) {
      const message =
        getApiErrorMessage(payload) ||
        getApiErrorMessage(backendResponse.statusText) ||
        "No se pudo eliminar el documento del candidato"
      return NextResponse.json({ message }, { status: backendResponse.status })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    return NextResponse.json(
      { message: getApiErrorMessage(err) || "Error al eliminar el documento del candidato" },
      { status: 500 }
    )
  }
}
