import { normalizeTemplateValue } from "@/lib/reportes/schema/report-schema-bindings"

function pickRecordKey(record: Record<string, unknown>, segment: string): unknown {
  if (segment === "." || segment === "this") {
    if (Object.prototype.hasOwnProperty.call(record, ".")) return record["."]
    if (Object.prototype.hasOwnProperty.call(record, "value")) return record["value"]
    return record
  }
  if (Object.prototype.hasOwnProperty.call(record, segment)) return record[segment]
  const lower = segment.toLowerCase()
  for (const key of Object.keys(record)) {
    if (key.toLowerCase() === lower) return record[key]
  }
  return undefined
}

/**
 * Resolves a dotted path against a context. Segment lookup is case-insensitive
 * so candidate payloads with `Company` / `company` both bind.
 */
export function resolveSheetPath(root: unknown, path: string): unknown {
  const trimmed = path.trim()
  if (!trimmed) return undefined
  if (trimmed === "." || trimmed === "this") {
    if (root != null && typeof root === "object" && !Array.isArray(root)) {
      return pickRecordKey(root as Record<string, unknown>, trimmed)
    }
    return root
  }

  const segments = trimmed
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean)

  let current: unknown = root
  for (const segment of segments) {
    if (current == null) return undefined
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index) || String(index) !== segment) return undefined
      current = current[index]
      continue
    }
    if (typeof current !== "object") return undefined
    current = pickRecordKey(current as Record<string, unknown>, segment)
  }
  return current
}

export function resolveSheetTemplateString(
  template: string,
  ctx: Record<string, unknown>,
  fallback = "—"
): string {
  if (!template) return ""
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, rawPath: string) => {
    return normalizeTemplateValue(resolveSheetPath(ctx, rawPath.trim()), fallback)
  })
}

export function resolveSheetBinding(
  raw: string,
  ctx: Record<string, unknown>,
  fallback = "—"
): string {
  if (raw.includes("{{")) {
    const resolved = resolveSheetTemplateString(raw, ctx, "")
    if (resolved.replace(/[\s—–-]/g, "") === "") return fallback
    return resolved.replace(/\s{2,}/g, " ").trim()
  }
  return normalizeTemplateValue(resolveSheetPath(ctx, raw), fallback)
}

export function asRecordArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function mergeRowContext(
  parent: Record<string, unknown>,
  item: unknown
): Record<string, unknown> {
  if (item != null && typeof item === "object" && !Array.isArray(item)) {
    return { ...parent, ...(item as Record<string, unknown>) }
  }
  return { ...parent, ".": item, this: item, value: item }
}
