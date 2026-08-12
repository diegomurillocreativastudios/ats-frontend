/**
 * Convierte el header Retry-After (segundos) a un entero con fallback seguro.
 */
export function parseRetryAfterSeconds(
  header: string | null | undefined,
  fallback = 60
): number {
  if (header == null || header === "") return fallback
  const sec = parseInt(header, 10)
  return Number.isFinite(sec) && sec > 0 ? sec : fallback
}
