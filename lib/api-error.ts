const FALLBACK_MESSAGE = "Error desconocido"

const GENERIC_PROBLEM_TITLES = new Set([
  "one or more validation errors occurred.",
  "an error occurred while processing your request.",
  "bad request",
  "not found",
  "unauthorized",
  "forbidden",
  "internal server error",
])

function tryParseJson(value: string): unknown | null {
  const trimmed = value.trim()
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

function collectValidationErrors(errors: unknown): string {
  if (!errors || typeof errors !== "object") return ""
  const parts: string[] = []
  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) {
      parts.push(value.trim())
      continue
    }
    if (!Array.isArray(value)) continue
    for (const item of value) {
      if (typeof item === "string" && item.trim()) parts.push(item.trim())
    }
  }
  return parts.join(" ")
}

function readRecordMessage(rec: Record<string, unknown>): string {
  const msg = typeof rec.message === "string" ? rec.message.trim() : ""
  const detail = typeof rec.detail === "string" ? rec.detail.trim() : ""
  const error = typeof rec.error === "string" ? rec.error.trim() : ""
  const title = typeof rec.title === "string" ? rec.title.trim() : ""
  const validation = collectValidationErrors(rec.errors)

  if (msg) {
    const parsed = tryParseJson(msg)
    if (parsed != null) return extractStructuredApiErrorMessage(parsed)
    if (detail) return `${msg} — ${detail}`
    return msg
  }
  if (detail) return detail
  if (error) {
    const parsed = tryParseJson(error)
    if (parsed != null) return extractStructuredApiErrorMessage(parsed)
    return error
  }
  if (validation) return validation
  if (title && !GENERIC_PROBLEM_TITLES.has(title.toLowerCase())) return title
  return ""
}

/**
 * Extrae un mensaje de error usable. Devuelve cadena vacía si solo hay ruido
 * técnico (JSON crudo, Problem Details genérico de ASP.NET).
 */
export function extractStructuredApiErrorMessage(payload: unknown): string {
  if (typeof payload === "string") {
    const parsed = tryParseJson(payload)
    if (parsed != null) return extractStructuredApiErrorMessage(parsed)
    return payload.trim()
  }
  if (payload instanceof Error) {
    const withBody = payload as Error & { body?: unknown }
    if (withBody.body !== undefined && withBody.body !== payload) {
      const fromBody = extractStructuredApiErrorMessage(withBody.body)
      if (fromBody) return fromBody
    }
    const parsed = tryParseJson(payload.message)
    if (parsed != null) return extractStructuredApiErrorMessage(parsed)
    return payload.message.trim()
  }
  if (typeof payload !== "object" || payload === null) return ""
  return readRecordMessage(payload as Record<string, unknown>)
}

/** Extrae mensaje legible de respuestas de error de API o valores unknown */
export function getApiErrorMessage(payload: unknown): string {
  return extractStructuredApiErrorMessage(payload) || FALLBACK_MESSAGE
}

export function isSilentError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false
  return "silent" in err && (err as { silent?: unknown }).silent === true
}

/** Error con marca `silent` para que la zona de upload no duplique el mensaje */
export function createSilentError(message: string): Error & { silent: true } {
  const e = new Error(message) as Error & { silent: true }
  e.silent = true
  return e
}
