import { extractStructuredApiErrorMessage } from "@/lib/api-error"
import { csrfHeaders } from "@/lib/auth/csrf-client"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"

/** Incluye application/json y application/problem+json (validación ASP.NET). */
function isJsonContentType(contentType: string): boolean {
  return contentType.includes("json")
}

const BFF_PREFIX = "/api/bff"

const getOrigin = () => {
  if (typeof window !== "undefined") return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

type ApiRequestOptions = RequestInit

export type ApiClientError = Error & {
  status: number
  body?: unknown
  retryAfter?: number
}

/**
 * Resolves a same-origin BFF URL for a backend path.
 * Absolute http(s) URLs are rejected so the client never attaches session cookies
 * or CSRF headers to third-party hosts (closes FE-SEC-021).
 */
export function resolveBffUrl(endpoint: string): string {
  const trimmed = endpoint.trim()
  if (!trimmed) {
    throw new Error("Endpoint vacío")
  }
  if (/^https?:\/\//i.test(trimmed)) {
    throw new Error(
      "apiClient no acepta URLs absolutas; usa rutas relativas al backend"
    )
  }
  const qIndex = trimmed.indexOf("?")
  const pathPart = qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed
  const queryPart = qIndex >= 0 ? trimmed.slice(qIndex) : ""
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`
  return `${BFF_PREFIX}${path}${queryPart}`
}

/** Build headers for same-origin BFF calls (no Bearer; CSRF on mutations). */
export const buildHeaders = async (
  options: ApiRequestOptions,
  omitContentType = false
): Promise<Record<string, string>> => {
  const method = (options.method ?? "GET").toUpperCase()
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
  const base: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }
  if (!omitContentType && !base["Content-Type"]) {
    base["Content-Type"] = "application/json"
  }
  if (isMutation && typeof window !== "undefined") {
    return csrfHeaders(base)
  }
  return base
}

/** Call our Next.js refresh route and return whether it succeeded. */
const tryRefresh = async () => {
  try {
    const headers = await csrfHeaders()
    const res = await fetch(`${getOrigin()}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers,
    })
    return res.ok
  } catch {
    return false
  }
}

export interface ApiResponseMeta<T = unknown> {
  data: T
  headers: Headers
}

export const apiClient = {
  async requestWithMeta(
    endpoint: string,
    options: ApiRequestOptions = {},
    isRetry = false
  ): Promise<ApiResponseMeta> {
    const url = resolveBffUrl(endpoint)
    const isFormData = options.body instanceof FormData
    const headers = await buildHeaders(options, isFormData)
    if (isFormData) {
      delete headers["Content-Type"]
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: "include",
    }

    const res = await fetch(url, config)
    // 204/205 sin cuerpo: no intentar parsear.
    let data: unknown = {}
    if (res.status !== 204 && res.status !== 205) {
      const contentType = res.headers.get("content-type")?.toLowerCase() ?? ""
      if (isJsonContentType(contentType)) {
        data = await res.json().catch(() => ({}))
      } else {
        data = await res.text().catch(() => "")
      }
    }

    if (res.status === 401 && !isRetry && typeof window !== "undefined") {
      const refreshed = await tryRefresh()
      if (refreshed) {
        return this.requestWithMeta(endpoint, options, true)
      }
      window.location.href = "/auth/iniciar-sesion"
      const err = new Error("Sesión expirada") as ApiClientError
      err.status = 401
      throw err
    }

    if (!res.ok) {
      const payload =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : {}
      const fromText =
        typeof data === "string" ? extractStructuredApiErrorMessage(data) : ""
      const fromBody = extractStructuredApiErrorMessage(payload)
      const message = fromBody || fromText || `Solicitud fallida (${res.status})`
      const err = new Error(message) as ApiClientError
      err.status = res.status
      err.body = data
      const retryAfterHeader = res.headers.get("retry-after")
      if (retryAfterHeader) {
        err.retryAfter = parseRetryAfterSeconds(retryAfterHeader)
      }
      throw err
    }
    return { data, headers: res.headers }
  },
  async request(
    endpoint: string,
    options: ApiRequestOptions = {},
    isRetry = false
  ) {
    const { data } = await this.requestWithMeta(endpoint, options, isRetry)
    return data
  },
  get(endpoint: string) {
    return this.request(endpoint, { method: "GET" })
  },
  /**
   * GET that keeps response headers (paging: X-Total-Count, X-Page, X-Page-Size).
   */
  getWithHeaders(endpoint: string) {
    return this.requestWithMeta(endpoint, { method: "GET" })
  },
  post(endpoint: string, body: unknown) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    })
  },
  put(endpoint: string, body: unknown) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  },
  patch(endpoint: string, body: unknown) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  },
  delete(endpoint: string) {
    return this.request(endpoint, { method: "DELETE" })
  },
  /**
   * POST con multipart/form-data (p. ej. File + EntityType).
   * No se debe enviar Content-Type; el navegador lo fija con boundary.
   */
  postFormData(endpoint: string, formData: FormData) {
    return this.request(endpoint, { method: "POST", body: formData })
  },
  /**
   * PUT con multipart/form-data (p. ej. actualizar entidad + reemplazar archivo).
   * No se debe enviar Content-Type; el navegador lo fija con boundary.
   */
  putFormData(endpoint: string, formData: FormData) {
    return this.request(endpoint, { method: "PUT", body: formData })
  },
}
