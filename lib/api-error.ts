/** Extrae mensaje legible de respuestas de error de API o valores unknown */
export function getApiErrorMessage(payload: unknown): string {
  if (typeof payload === "string") return payload
  if (payload instanceof Error) return payload.message
  if (typeof payload !== "object" || payload === null) return "Error desconocido"
  const rec = payload as Record<string, unknown>
  if (typeof rec.message === "string") return rec.message
  if (typeof rec.detail === "string") return rec.detail
  return "Error desconocido"
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
