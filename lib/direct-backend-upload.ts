import { csrfHeaders } from "@/lib/auth/csrf-client"

/**
 * Vercel Functions reject request bodies above 4.5 MB with
 * FUNCTION_PAYLOAD_TOO_LARGE before the route handler runs.
 * Stay under that cap when the upload still goes through the BFF.
 */
export const VERCEL_FUNCTION_SAFE_BODY_BYTES = 4_000_000

/** Public apply accepts a CV without a session. */
const ANONYMOUS_LARGE_UPLOAD_PATHS = new Set([
  "/api/candidate/personal-appliance",
])

export type UploadGrant = {
  apiBaseUrl: string
  accessToken: string | null
}

export type DirectUploadPlan =
  | { ok: true; url: string; headers: Record<string, string> }
  | { ok: false; reason: "unauthorized" | "missing-api-url" | "invalid-path" }

/**
 * Sum of multipart part sizes. Boundaries add a little; the safe cap leaves room for them.
 */
export function estimateFormDataBytes(formData: FormData): number {
  let total = 0
  for (const value of formData.values()) {
    if (typeof value === "string") {
      total += new TextEncoder().encode(value).length
    } else {
      total += value.size
    }
  }
  return total
}

export function exceedsVercelFunctionBodyLimit(byteLength: number): boolean {
  return byteLength > VERCEL_FUNCTION_SAFE_BODY_BYTES
}

export function backendPathname(endpoint: string): string {
  const trimmed = endpoint.trim()
  const queryIndex = trimmed.indexOf("?")
  const path = queryIndex >= 0 ? trimmed.slice(0, queryIndex) : trimmed
  return path.replace(/\/+$/, "") || "/"
}

export function allowsAnonymousLargeUpload(endpoint: string): boolean {
  return ANONYMOUS_LARGE_UPLOAD_PATHS.has(backendPathname(endpoint))
}

/**
 * Relative backend path only. Rejects absolute URLs and traversal.
 */
export function isSafeBackendPath(endpoint: string): boolean {
  const path = backendPathname(endpoint)
  if (!path.startsWith("/") || path.startsWith("//")) return false
  if (path.includes("\\") || path.includes("://")) return false
  if (path.split("/").includes("..")) return false
  return true
}

/**
 * Browser POST target for a body that cannot fit in a Vercel Function.
 * Cookies stay on the app origin; the API call uses Authorization only when a session exists.
 */
export function buildDirectUploadRequest(
  endpoint: string,
  grant: UploadGrant
): DirectUploadPlan {
  if (!isSafeBackendPath(endpoint)) {
    return { ok: false, reason: "invalid-path" }
  }

  const apiBaseUrl = grant.apiBaseUrl.trim().replace(/\/$/, "")
  if (!apiBaseUrl) {
    return { ok: false, reason: "missing-api-url" }
  }

  const headers: Record<string, string> = {}
  if (grant.accessToken) {
    headers.Authorization = `Bearer ${grant.accessToken}`
  } else if (!allowsAnonymousLargeUpload(endpoint)) {
    return { ok: false, reason: "unauthorized" }
  }

  return {
    ok: true,
    url: `${apiBaseUrl}${endpoint.trim()}`,
    headers,
  }
}

export type UploadGrantResult =
  | { ok: true; direct: false }
  | { ok: true; direct: true; grant: UploadGrant }
  | { ok: false; status: number; message: string }

/**
 * Same-origin call. On Vercel the route returns the public API origin and the
 * bearer so the browser can POST the file without cookies. Elsewhere it returns
 * direct: false and the caller keeps the upload on the BFF.
 */
export async function fetchUploadGrant(): Promise<UploadGrantResult> {
  const headers = await csrfHeaders()
  const response = await fetch("/api/auth/upload-grant", {
    method: "POST",
    credentials: "include",
    headers,
    cache: "no-store",
  })

  const data = (await response.json().catch(() => ({}))) as {
    message?: string
    direct?: boolean
    apiBaseUrl?: string
    accessToken?: string | null
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: data.message?.trim() || "No se pudo preparar la carga del archivo",
    }
  }

  if (data.direct !== true) {
    return { ok: true, direct: false }
  }

  return {
    ok: true,
    direct: true,
    grant: {
      apiBaseUrl: typeof data.apiBaseUrl === "string" ? data.apiBaseUrl : "",
      accessToken:
        typeof data.accessToken === "string" && data.accessToken.trim()
          ? data.accessToken
          : null,
    },
  }
}
