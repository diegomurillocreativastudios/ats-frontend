import { getAccessToken } from "@/lib/auth"

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || ""

const getOrigin = () => {
  if (typeof window !== "undefined") return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

type ApiRequestOptions = RequestInit

/** Attach Bearer token to request when available (client-side). */
const buildHeaders = (
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

export const apiClient = {
  async request(
    endpoint: string,
    options: ApiRequestOptions = {},
    isRetry = false
  ) {
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
    // 204/205 sin cuerpo: no intentar JSON.parse del body vacío.
    const data =
      res.status === 204 || res.status === 205
        ? {}
        : await res.json().catch(() => ({}))

    if (res.status === 401 && !isRetry && typeof window !== "undefined") {
      const refreshed = await tryRefresh()
      if (refreshed) {
        return this.request(endpoint, options, true)
      }
      window.location.href = "/auth/iniciar-sesion"
      const err = new Error("Sesión expirada") as Error & { status: number }
      err.status = 401
      throw err
    }

    if (!res.ok) {
      const payload =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : {}
      const fromBody =
        (typeof payload.message === "string" && payload.message.trim()) ||
        (typeof payload.error === "string" && payload.error.trim()) ||
        (typeof payload.detail === "string" && payload.detail.trim())
      const message = fromBody || `Solicitud fallida (${res.status})`
      const err = new Error(message) as Error & {
        status: number
        body?: unknown
      }
      err.status = res.status
      err.body = data
      throw err
    }
    return data
  },
  get(endpoint: string) {
    return this.request(endpoint, { method: "GET" })
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
}
