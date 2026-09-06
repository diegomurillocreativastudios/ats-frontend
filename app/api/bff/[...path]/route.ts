import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth"
import { buildBackendPathFromSegments } from "@/lib/api/bff-path"
import { getServerBackendBaseUrl } from "@/lib/server-backend-url"
import {
  getUploadMaxBytesForBackendPath,
  readRequestBodyWithinLimit,
} from "@/lib/upload-body-limit"

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
])

const FORWARD_REQUEST_HEADERS = new Set([
  "accept",
  "accept-language",
  "content-type",
  "if-none-match",
  "if-modified-since",
  "range",
])

const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
  "x-total-count",
  "x-page",
  "x-page-size",
  "retry-after",
  "content-range",
  "accept-ranges",
]

async function proxyToBackend(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
): Promise<NextResponse> {
  const { path: segments } = await context.params
  const backendPath = buildBackendPathFromSegments(segments)
  if (!backendPath) {
    return NextResponse.json({ message: "Ruta inválida" }, { status: 400 })
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

  const search = request.nextUrl.search || ""
  const targetUrl = `${baseUrl}${backendPath}${search}`

  const accessToken = request.cookies.get(AUTH_COOKIES.access)?.value
  const headers = new Headers()
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) continue
    if (lower === "cookie" || lower === "authorization") continue
    if (!FORWARD_REQUEST_HEADERS.has(lower)) continue
    headers.set(key, value)
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`)
  }

  const method = request.method.toUpperCase()
  const hasBody = method !== "GET" && method !== "HEAD"

  let body: ArrayBuffer | undefined
  if (hasBody) {
    const maxBytes = getUploadMaxBytesForBackendPath(backendPath)
    const bounded = await readRequestBodyWithinLimit(request, maxBytes)
    if (!bounded.ok) {
      return NextResponse.json(
        { message: bounded.message },
        { status: bounded.status }
      )
    }
    body = bounded.body
  }

  let backendResponse: Response
  try {
    backendResponse = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? body : undefined,
      cache: "no-store",
      redirect: "manual",
    })
  } catch {
    return NextResponse.json(
      { message: "No se pudo contactar al servicio" },
      { status: 502 }
    )
  }

  const responseHeaders = new Headers()
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = backendResponse.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }
  // Never forward Set-Cookie from the backend to the browser.
  responseHeaders.set("Cache-Control", "private, no-store")

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxyToBackend(request, context)
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxyToBackend(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxyToBackend(request, context)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxyToBackend(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxyToBackend(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return proxyToBackend(request, context)
}
