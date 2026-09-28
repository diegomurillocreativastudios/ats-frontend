import { extractStructuredApiErrorMessage } from "@/lib/api-error"

/** Statuses where short product copy may be forwarded to the client. */
const PRODUCT_SAFE_STATUSES = new Set([400, 401, 403, 404, 409, 413, 415, 422, 429])

const TECHNICAL_NOISE_RE =
  /traceid|stack\s*trace|at\s+\w+\s*\(|exception|problem\s*details|rfc\s*9110|internal\s*server|system\.|microsoft\.|asp\.?net|sql|connection\s*refused|econnrefused|enotfound|etimedout|the\s+value\s+['"].*['"]\s+is\s+not\s+valid/i

const LOOKS_LIKE_JSON_RE = /^\s*[\[{]/

/**
 * True when a candidate message looks like infrastructure / framework noise
 * that must not be shown to end users.
 */
export function looksLikeTechnicalErrorMessage(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return true
  if (LOOKS_LIKE_JSON_RE.test(trimmed)) return true
  if (trimmed.length > 280) return true
  if (TECHNICAL_NOISE_RE.test(trimmed)) return true
  if (/\n\s*at\s+/.test(trimmed)) return true
  return false
}

/**
 * Resolves a safe public-facing error message from a backend status + payload.
 * Product 4xx copy may pass through; 5xx and technical noise use `fallback`.
 */
export function toPublicApiErrorMessage(
  status: number,
  payload: unknown,
  fallback: string
): string {
  if (status >= 500) return fallback
  if (!PRODUCT_SAFE_STATUSES.has(status)) return fallback

  const extracted = extractStructuredApiErrorMessage(payload).trim()
  if (!extracted) return fallback
  if (looksLikeTechnicalErrorMessage(extracted)) return fallback
  return extracted
}

/**
 * Builds a JSON body `{ message }` suitable for Route Handler responses.
 */
export function publicApiErrorBody(
  status: number,
  payload: unknown,
  fallback: string
): { message: string } {
  return { message: toPublicApiErrorMessage(status, payload, fallback) }
}
