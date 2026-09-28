import { type ApiClientError } from "@/lib/api"
import { extractStructuredApiErrorMessage } from "@/lib/api-error"
import { csrfHeaders } from "@/lib/auth/csrf-client"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"
import { buildSafeLogoDataUri } from "@/lib/safe-logo-data-uri"
import {
  LOGO_EXTENSIONS,
  LOGO_TYPES,
  UPLOAD_MAX_BYTES_5_MB,
} from "@/lib/upload-constraints"

export const RECRUITER_PHOTO_ALLOWLIST = {
  types: LOGO_TYPES,
  extensions: LOGO_EXTENSIONS,
  maxBytes: UPLOAD_MAX_BYTES_5_MB,
} as const

export type RecruiterProfilePhoto = {
  photoFileId: string
  contentType: string
  fileName: string | null
  sizeBytes: number
  dataUri: string
}

function toStr(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

function throwApiError(
  message: string,
  status: number,
  extra?: { retryAfter?: number; body?: unknown }
): never {
  const err = new Error(message) as ApiClientError
  err.status = status
  if (extra?.retryAfter != null) err.retryAfter = extra.retryAfter
  if (extra?.body !== undefined) err.body = extra.body
  throw err
}

async function refreshAuthSession(): Promise<boolean> {
  try {
    const headers = await csrfHeaders()
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers,
    })
    return res.ok
  } catch {
    return false
  }
}

function redirectToLogin() {
  if (typeof window === "undefined") return
  window.location.href = "/auth/iniciar-sesion"
}

/**
 * Maps the backend/BFF photo JSON to a safe raster data URI.
 */
export function mapRecruiterProfilePhoto(
  raw: unknown
): RecruiterProfilePhoto | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const contentType = toStr(o.contentType ?? o.content_type)
  const dataUri = buildSafeLogoDataUri({
    base64: toStr(o.base64) || null,
    contentType: contentType || null,
  })
  if (!dataUri) return null

  const photoFileId = toStr(o.photoFileId ?? o.photo_file_id)
  const fileName = toStr(o.fileName ?? o.file_name)
  const sizeRaw = o.sizeBytes ?? o.size_bytes
  const sizeBytes =
    typeof sizeRaw === "number" && Number.isFinite(sizeRaw) ? sizeRaw : 0

  return {
    photoFileId,
    contentType: contentType || "image/png",
    fileName: fileName || null,
    sizeBytes,
    dataUri,
  }
}

async function parseJsonBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type")?.toLowerCase() ?? ""
  if (contentType.includes("json")) {
    return res.json().catch(() => ({}))
  }
  return res.text().catch(() => "")
}

function throwIfFailed(res: Response, data: unknown): void {
  if (res.ok) return
  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {}
  const fromText =
    typeof data === "string" ? extractStructuredApiErrorMessage(data) : ""
  const message =
    extractStructuredApiErrorMessage(payload) ||
    fromText ||
    `Solicitud fallida (${res.status})`
  const retryAfterHeader = res.headers.get("retry-after")
  throwApiError(message, res.status, {
    body: data,
    retryAfter: retryAfterHeader
      ? parseRetryAfterSeconds(retryAfterHeader)
      : undefined,
  })
}

async function handleUnauthorized(
  res: Response,
  data: unknown,
  retry: () => Promise<unknown>
): Promise<unknown | null> {
  if (res.status !== 401) return null
  const refreshed = await refreshAuthSession()
  if (refreshed) return retry()
  redirectToLogin()
  throwApiError("Sesión expirada", 401, { body: data })
}

/**
 * Loads the authenticated recruiter photo. 404 → `null`.
 */
export async function getRecruiterProfilePhoto(
  isRetry = false
): Promise<RecruiterProfilePhoto | null> {
  const res = await fetch("/api/auth/profile/photo", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })
  const data = await parseJsonBody(res)

  if (res.status === 404) return null

  if (res.status === 401 && !isRetry) {
    const retried = await handleUnauthorized(res, data, () =>
      getRecruiterProfilePhoto(true)
    )
    return retried as RecruiterProfilePhoto | null
  }
  if (res.status === 401) {
    redirectToLogin()
    throwApiError("Sesión expirada", 401, { body: data })
  }

  throwIfFailed(res, data)
  return mapRecruiterProfilePhoto(data)
}

/**
 * Uploads or replaces the authenticated recruiter photo.
 */
export async function uploadRecruiterProfilePhoto(
  file: File,
  isRetry = false
): Promise<RecruiterProfilePhoto> {
  const form = new FormData()
  form.append("photo", file, file.name || "photo")
  const headers = await csrfHeaders()
  const res = await fetch("/api/auth/profile/photo", {
    method: "PUT",
    credentials: "include",
    headers,
    cache: "no-store",
    body: form,
  })
  const data = await parseJsonBody(res)

  if (res.status === 401 && !isRetry) {
    const retried = await handleUnauthorized(res, data, () =>
      uploadRecruiterProfilePhoto(file, true)
    )
    return retried as RecruiterProfilePhoto
  }
  if (res.status === 401) {
    redirectToLogin()
    throwApiError("Sesión expirada", 401, { body: data })
  }

  throwIfFailed(res, data)
  const photo = mapRecruiterProfilePhoto(data)
  if (!photo) {
    throwApiError("No se pudo actualizar la foto.", 502, { body: data })
  }
  return photo
}

/**
 * Deletes the authenticated recruiter photo.
 */
export async function deleteRecruiterProfilePhoto(
  isRetry = false
): Promise<void> {
  const headers = await csrfHeaders()
  const res = await fetch("/api/auth/profile/photo", {
    method: "DELETE",
    credentials: "include",
    headers,
    cache: "no-store",
  })

  if (res.status === 204) return

  const data = await parseJsonBody(res)
  if (res.status === 401 && !isRetry) {
    await handleUnauthorized(res, data, () =>
      deleteRecruiterProfilePhoto(true)
    )
    return
  }
  if (res.status === 401) {
    redirectToLogin()
    throwApiError("Sesión expirada", 401, { body: data })
  }

  throwIfFailed(res, data)
}
