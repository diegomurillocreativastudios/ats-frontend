const DEFAULT_FALLBACK = "—"

export function resolvePath(source: unknown, path: string): unknown {
  if (!path) return undefined
  if (source == null || typeof source !== "object") return undefined

  const parts = path.split(".").map((part) => part.trim()).filter(Boolean)
  let current: unknown = source

  for (const part of parts) {
    if (current == null) return undefined
    if (Array.isArray(current)) {
      const index = Number(part)
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined
      current = current[index]
      continue
    }
    if (typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part]
      continue
    }
    return undefined
  }

  return current
}

export function normalizeTemplateValue(
  value: unknown,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (value == null) return fallback
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed === "" ? fallback : value
  }
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : fallback
  if (typeof value === "boolean") return value ? "Sí" : "No"
  return String(value)
}

export function resolveTemplateString(
  template: string,
  ctx: Record<string, unknown>,
  fallback: string = DEFAULT_FALLBACK
): string {
  if (!template) return ""
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, rawPath: string) => {
    const value = resolvePath(ctx, rawPath.trim())
    return normalizeTemplateValue(value, fallback)
  })
}
