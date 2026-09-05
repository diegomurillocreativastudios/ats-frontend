import { extractStructuredApiErrorMessage } from "@/lib/api-error"
import { getAccessToken } from "@/lib/auth"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"

/** Incluye application/json y application/problem+json (validación ASP.NET). */
function isJsonContentType(contentType: string): boolean {
  return contentType.includes("json")
}

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || ""

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

/** Attach Bearer token to request when available (client-side). */
export const buildHeaders = (
  options: ApiRequestOptions,
  omitContentType = false
) => {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }
  if (!omitContentType) {
    headers["Content-Type"] = "application/json"
  }
  if (typeof window !== "undefined") {
    const token = getAccessToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }
  return headers
}

/** Call our Next.js refresh route and return whether it succeeded. */
const tryRefresh = async () => {
  try {
    const res = await fetch(`${getOrigin()}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
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
    const baseUrl = getBaseUrl().replace(/\/$/, '');
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const isFormData = options.body instanceof FormData
    const config: RequestInit = {
      ...options,
      headers: buildHeaders(options, isFormData),
      credentials:
        options.credentials ??
        (endpoint.startsWith("http") ? undefined : "omit"),
    }
    if (isFormData && config.headers && typeof config.headers === "object") {
      delete (config.headers as Record<string, string>)["Content-Type"]
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
