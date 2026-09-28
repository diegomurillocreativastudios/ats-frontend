import { type ApiClientError } from "@/lib/api"
import { extractStructuredApiErrorMessage } from "@/lib/api-error"
import { csrfHeaders } from "@/lib/auth/csrf-client"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"
import {
  buildRecruiterProfilePatchBody,
  resolveRecruiterProfileName,
} from "@/lib/rrhh/recruiter-display-name"

export type RecruiterAccount = {
  id: string | null
  name: string
  email: string
  role: string | null
  hasPhoto: boolean
}

export type UpdateRecruiterAccountBody = {
  userName: string
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
 * Mapea GET/PATCH `/api/auth/profile` o un objeto de sesión anidado.
 */
export function mapRecruiterAccount(
  raw: unknown,
  fallbackName = ""
): RecruiterAccount {
  const root =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const nested =
    root.user && typeof root.user === "object"
      ? (root.user as Record<string, unknown>)
      : root

  const email = toStr(nested.email ?? root.email)
  const name =
    resolveRecruiterProfileName({
      name: toStr(nested.name ?? root.name) || null,
      userName: toStr(nested.userName ?? root.userName) || null,
      fullName: toStr(nested.fullName ?? root.fullName) || null,
      email,
    }) || fallbackName.trim()

  const roleRaw = nested.role ?? nested.type ?? root.role
  const roles = nested.roles ?? root.roles
  const hasPhotoRaw =
    nested.hasPhoto ?? nested.has_photo ?? root.hasPhoto ?? root.has_photo

  return {
    id:
      nested.id != null
        ? String(nested.id)
        : root.id != null
          ? String(root.id)
          : null,
    name,
    email,
    role:
      roleRaw != null && String(roleRaw).trim() !== ""
        ? String(roleRaw)
        : Array.isArray(roles) && roles.length > 0
          ? String(roles[0])
          : null,
    hasPhoto:
      typeof hasPhotoRaw === "boolean"
        ? hasPhotoRaw
        : typeof hasPhotoRaw === "string"
          ? hasPhotoRaw.toLowerCase() === "true"
          : false,
  }
}

/**
 * Actualiza el nombre visible de la cuenta autenticada.
 * Contrato: `PATCH /api/auth/profile` con `{ userName, name }` iguales.
 */
export async function updateRecruiterAccount(
  body: UpdateRecruiterAccountBody,
  isRetry = false
): Promise<RecruiterAccount> {
  const patchBody = buildRecruiterProfilePatchBody(body.userName)
  const headers = await csrfHeaders({ "Content-Type": "application/json" })
  const res = await fetch("/api/auth/profile", {
    method: "PATCH",
    credentials: "include",
    headers,
    cache: "no-store",
    body: JSON.stringify(patchBody),
  })

  const contentType = res.headers.get("content-type")?.toLowerCase() ?? ""
  const data = contentType.includes("json")
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => "")

  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshAuthSession()
    if (refreshed) {
      return updateRecruiterAccount(body, true)
    }
    redirectToLogin()
    throwApiError("Sesión expirada", 401, { body: data })
  }

  if (res.status === 401) {
    redirectToLogin()
    throwApiError("Sesión expirada", 401, { body: data })
  }

  if (!res.ok) {
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

  return mapRecruiterAccount(data, patchBody.userName)
}
