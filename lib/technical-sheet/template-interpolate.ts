import { sanitizeTemplateHtml } from "@/lib/html/sanitize-template-html"

export {
  buildTechnicalSheetTemplateContext,
  type TechnicalSheetTemplateContextOptions,
} from "@/lib/technical-sheet/technical-sheet-template-context"

/**
 * Dynamic sections: `{{#each path.to.array}} ... {{/each}}` (nestable). Inside each block,
 * placeholders resolve against the current item merged onto the root context (so `{{header.fullName}}`
 * still works). Use `{{.}}` for primitive array items; `{{@index}}` for 0-based index.
 *
 * Scalar placeholders: `{{path.with.dots}}` after `#each` expansion.
 * Missing paths render as empty string; values are HTML-escaped when substituted.
 */
const PLACEHOLDER_RE = /\{\{\s*([^}\n]+?)\s*\}\}/g

interface EachBlockMatch {
  start: number
  end: number
  path: string
  inner: string
}

function findFirstEachBlock(template: string): EachBlockMatch | null {
  const start = template.indexOf("{{#each")
  if (start === -1) return null
  const header = template.slice(start).match(/^\{\{#each\s+([a-zA-Z][a-zA-Z0-9_.]*)\s*\}\}/)
  if (!header) return null
  const path = header[1]
  let pos = start + header[0].length
  let depth = 1
  while (pos < template.length && depth > 0) {
    const rest = template.slice(pos)
    const idxOpen = rest.indexOf("{{#each")
    const idxClose = rest.indexOf("{{/each}}")
    if (idxClose === -1) return null
    const hasOpen = idxOpen !== -1
    if (hasOpen && idxOpen < idxClose) {
      const openTag = rest.slice(idxOpen).match(/^\{\{#each\s+[a-zA-Z][a-zA-Z0-9_.]*\s*\}\}/)
      if (!openTag) return null
      depth++
      pos += idxOpen + openTag[0].length
    } else {
      depth--
      const closeEnd = pos + idxClose + "{{/each}}".length
      if (depth === 0) {
        const inner = template.slice(start + header[0].length, pos + idxClose)
        return { start, end: closeEnd, path, inner }
      }
      pos = closeEnd
    }
  }
  return null
}

/**
 * Expands `{{#each path}} inner {{/each}}` from the outside in (balanced nesting).
 */
export function expandEachBlocks(template: string, context: Record<string, unknown>): string {
  const block = findFirstEachBlock(template)
  if (!block) return template
  const arr = getByPath(context, block.path.trim())
  const replacement =
    !Array.isArray(arr) || arr.length === 0
      ? ""
      : arr
          .map((item, idx) => {
            const spread =
              item != null && typeof item === "object" && !Array.isArray(item)
                ? (item as Record<string, unknown>)
                : { ".": item, value: item }
            const merged: Record<string, unknown> = {
              ...context,
              ...spread,
              "@index": idx,
            }
            const expandedInner = expandEachBlocks(block.inner, merged)
            return interpolateTechnicalSheetTemplate(expandedInner, merged)
          })
          .join("")
  const next = template.slice(0, block.start) + replacement + template.slice(block.end)
  return expandEachBlocks(next, context)
}

/**
 * Full pipeline: `#each` loops, then `{{path}}` substitution, then XSS sanitize.
 */
export function renderTechnicalSheetHtml(
  template: string,
  context: Record<string, unknown>
): string {
  const expanded = expandEachBlocks(template, context)
  const interpolated = interpolateTechnicalSheetTemplate(expanded, context)
  return sanitizeTemplateHtml(interpolated)
}

export function escapeHtmlForTechnicalSheet(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function pickRecordKey(o: Record<string, unknown>, seg: string): unknown {
  if (seg === ".") return Object.prototype.hasOwnProperty.call(o, ".") ? o["."] : undefined
  if (seg.toLowerCase() === "this") {
    if (Object.prototype.hasOwnProperty.call(o, ".")) return o["."]
    if (Object.prototype.hasOwnProperty.call(o, "value")) return o["value"]
  }
  if (Object.prototype.hasOwnProperty.call(o, seg)) return o[seg]
  const lower = seg.toLowerCase()
  for (const k of Object.keys(o)) {
    if (k.toLowerCase() === lower) return o[k]
  }
  const titled = seg.charAt(0).toUpperCase() + seg.slice(1)
  if (Object.prototype.hasOwnProperty.call(o, titled)) return o[titled]
  return undefined
}

function getByPath(root: unknown, path: string): unknown {
  const t = path.trim()
  if (t === ".") {
    if (root != null && typeof root === "object" && !Array.isArray(root)) {
      return pickRecordKey(root as Record<string, unknown>, ".")
    }
    return undefined
  }
  const segments = t
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean)
  let cur: unknown = root
  for (const seg of segments) {
    if (cur == null) return undefined
    if (Array.isArray(cur)) {
      const idx = Number(seg)
      if (!Number.isNaN(idx) && Number.isInteger(idx) && String(idx) === seg) {
        cur = cur[idx]
        continue
      }
      return undefined
    }
    if (typeof cur !== "object") return undefined
    cur = pickRecordKey(cur as Record<string, unknown>, seg)
  }
  return cur
}

function formatLeafValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    return value
      .map((x) => formatLeafValue(x))
      .filter((s) => s !== "")
      .join(", ")
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return ""
    }
  }
  return String(value)
}

function substitutePlaceholder(
  pathStr: string,
  context: Record<string, unknown>,
  fullMatch: string
): string {
  const trimmed = pathStr.trim()
  if (trimmed.startsWith("#")) return fullMatch
  const raw = getByPath(context, trimmed)
  const text = formatLeafValue(raw)
  if (trimmed === "logoUrl") {
    const s = text.trim()
    if (/^data:image\/[a-z0-9+.-]+;base64,/i.test(s) || /^https?:\/\//i.test(s)) {
      return s.replace(/"/g, "")
    }
  }
  return escapeHtmlForTechnicalSheet(text)
}

export function interpolateTechnicalSheetTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(PLACEHOLDER_RE, (_full, pathStr: string) =>
    substitutePlaceholder(pathStr, context, _full)
  )
}
