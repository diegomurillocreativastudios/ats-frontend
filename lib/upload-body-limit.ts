import {
  UPLOAD_MAX_BYTES_5_MB,
  UPLOAD_MAX_BYTES_10_MB,
  UPLOAD_MAX_BYTES_15_MB,
  UPLOAD_MAX_BYTES_20_MB,
} from "@/lib/upload-constraints"

const BODY_TOO_LARGE_MESSAGE =
  "El cuerpo de la solicitud supera el límite permitido"

/**
 * Path-aware upload body ceiling for Backend-for-Frontend and leftover upload routes.
 * Defaults to 20 MB (current BFF ceiling); never opens above that.
 */
export function getUploadMaxBytesForBackendPath(backendPath: string): number {
  const path = (backendPath.split("?")[0] || "").replace(/\/+$/, "") || "/"

  if (
    path === "/api/admin/companies" ||
    /^\/api\/admin\/companies\/[^/]+$/.test(path)
  ) {
    return UPLOAD_MAX_BYTES_5_MB
  }

  if (path === "/api/candidate/profile/tailor-to-vacancy") {
    return UPLOAD_MAX_BYTES_10_MB
  }

  if (
    path === "/Ingest/upload" ||
    path === "/api/candidate/personal-appliance" ||
    /^\/api\/candidate\/[^/]+\/documents$/.test(path)
  ) {
    return UPLOAD_MAX_BYTES_15_MB
  }

  if (/^\/api\/recruiter\/report-documents\/[^/]+\/pdf$/.test(path)) {
    return UPLOAD_MAX_BYTES_20_MB
  }

  return UPLOAD_MAX_BYTES_20_MB
}

export type BoundedBodyResult =
  | { ok: true; body: ArrayBuffer }
  | { ok: false; status: 413; message: string }

/**
 * Narrows a bounded-body result to the 413 size-limit rejection.
 */
export function isBoundedBodyTooLarge(
  result: BoundedBodyResult
): result is Extract<BoundedBodyResult, { ok: false }> {
  return result.ok === false
}

/**
 * Rejects oversized bodies via Content-Length first, then after buffering.
 * Does not stream-cut; still avoids unbounded formData() parsing.
 */
export async function readRequestBodyWithinLimit(
  request: Request,
  maxBytes: number
): Promise<BoundedBodyResult> {
  const contentLengthHeader = request.headers.get("content-length")
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader)
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return {
        ok: false,
        status: 413,
        message: BODY_TOO_LARGE_MESSAGE,
      }
    }
  }

  const body = await request.arrayBuffer()
  if (body.byteLength > maxBytes) {
    return {
      ok: false,
      status: 413,
      message: BODY_TOO_LARGE_MESSAGE,
    }
  }

  return { ok: true, body }
}
