import { randomBytes } from "node:crypto"

const REDACT_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  {
    re: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    replacement: "Bearer [REDACTED]",
  },
  {
    re: /(access[_-]?token|refresh[_-]?token|password|token)\s*[:=]\s*["']?[^"'&\s,]+["']?/gi,
    replacement: "$1=[REDACTED]",
  },
  {
    re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    replacement: "[REDACTED_EMAIL]",
  },
]

/**
 * Redacts tokens, Bearer headers, and emails from a log fragment.
 */
export function redactSensitiveText(value: string): string {
  let out = value
  for (const { re, replacement } of REDACT_PATTERNS) {
    out = out.replace(re, replacement)
  }
  return out
}

function errorToSafeMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message?.trim() || err.name || "Error"
    return redactSensitiveText(msg.slice(0, 400))
  }
  if (typeof err === "string") {
    return redactSensitiveText(err.slice(0, 400))
  }
  try {
    return redactSensitiveText(JSON.stringify(err).slice(0, 400))
  } catch {
    return "Unknown error"
  }
}

/**
 * Logs a server-side error with a short correlation id and redacted message.
 * Never logs full stacks to keep tokens / PII out of shared log sinks.
 * Returns the correlation id for optional inclusion in internal telemetry.
 */
export function logServerError(scope: string, err: unknown): string {
  const correlationId = randomBytes(4).toString("hex")
  const safeMessage = errorToSafeMessage(err)
  console.error(`[${scope}] id=${correlationId} ${safeMessage}`)
  return correlationId
}
