import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"
import {
  getTechnicalSheetCandidateHeaderFacts,
  pickCandidateDisplayRecord,
} from "@/lib/technical-sheet/candidate-from-payload"

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
 * Full pipeline: `#each` loops, then `{{path}}` substitution.
 */
export function renderTechnicalSheetHtml(
  template: string,
  context: Record<string, unknown>
): string {
  const expanded = expandEachBlocks(template, context)
  return interpolateTechnicalSheetTemplate(expanded, context)
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

export interface TechnicalSheetTemplateContextOptions {
  vacancyTitleFallback?: string | null
  /**
   * URL absoluta del logo (p. ej. `https://tu-dominio.com/Applican_Tree.svg`).
   * Necesaria en plantillas renderizadas en iframe `srcDoc`, donde `/ruta` no resuelve contra el origen de la app.
   */
  logoUrl?: string | null
}

const WORK_EXPERIENCE_LIST_KEYS = [
  "responsibilities",
  "Responsibilities",
  "functions",
  "Functions",
  "mainFunctions",
  "MainFunctions",
  "bullets",
  "Bullets",
  "achievements",
  "Achievements",
] as const

function workExperienceItemHasBulletList(o: Record<string, unknown>): boolean {
  for (const k of WORK_EXPERIENCE_LIST_KEYS) {
    const v = o[k]
    if (Array.isArray(v) && v.some((x) => String(x).trim() !== "")) return true
  }
  return false
}

function readWorkExperienceDescription(o: Record<string, unknown>): string {
  const v = o.Description ?? o.description ?? o.summary ?? o.Summary
  return typeof v === "string" ? v.trim() : ""
}

/**
 * Misma heurística que el PDF: líneas, o frases largas partidas por oración.
 */
function splitWorkDescriptionToBullets(desc: string): string[] {
  if (!desc) return []
  const lines = desc
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-•*·]+/, "").trim())
    .filter((line) => line !== "")
  if (lines.length > 1) return lines
  if (lines.length === 1) {
    const single = lines[0]
    if (single.length > 200) {
      const bySentence = single.split(/(?<=[.!?])\s+/).filter((p) => p.trim().length > 0)
      if (bySentence.length > 1) return bySentence
    }
    return lines
  }
  return [desc]
}

/**
 * Ajusta el objeto candidato para plantillas HTML: `Description` → `responsibilities`.
 */
function normalizeCandidateRecordForTemplateHtml(candidate: Record<string, unknown>): void {
  const wx =
    (Array.isArray(candidate.workExperience) && candidate.workExperience) ||
    (Array.isArray(candidate.WorkExperience) && candidate.WorkExperience) ||
    null
  if (wx) {
    candidate.workExperience = wx.map((item) => {
      if (item == null || typeof item !== "object" || Array.isArray(item)) return item
      const o = { ...(item as Record<string, unknown>) }
      if (!workExperienceItemHasBulletList(o)) {
        const desc = readWorkExperienceDescription(o)
        if (desc) o.responsibilities = splitWorkDescriptionToBullets(desc)
      }
      return o
    })
  }
}

/**
 * Root object for `{{...}}` substitution: merges payload sections with `header` and `candidate` shortcuts.
 */
export function buildTechnicalSheetTemplateContext(
  payload: TechnicalSheetPayload,
  options?: TechnicalSheetTemplateContextOptions
): Record<string, unknown> {
  const facts = getTechnicalSheetCandidateHeaderFacts(payload)
  const header = {
    fullName: facts?.fullName ?? "",
    address: facts?.address ?? "",
    englishLevel: facts?.englishLevel ?? "",
  }

  const vacancySrc = payload.vacancy ?? payload.vacancyInfo
  const vacancy: Record<string, unknown> =
    vacancySrc != null && typeof vacancySrc === "object" && !Array.isArray(vacancySrc)
      ? { ...(vacancySrc as Record<string, unknown>) }
      : {}

  const fallback = options?.vacancyTitleFallback?.trim()
  if (fallback && !pickRecordKey(vacancy, "title") && !pickRecordKey(vacancy, "Title")) {
    vacancy.title = fallback
  }

  const candidateRecord = pickCandidateDisplayRecord(payload)
  const candRaw = candidateRecord ? { ...candidateRecord } : {}
  const techRaw = candRaw["technicalSkills"]
  const skillsRaw = candRaw["skills"]
  if ((!Array.isArray(techRaw) || techRaw.length === 0) && Array.isArray(skillsRaw) && skillsRaw.length > 0) {
    candRaw["technicalSkills"] = skillsRaw
  }

  normalizeCandidateRecordForTemplateHtml(candRaw)

  const langsCheck = candRaw["languages"]
  if (
    (!Array.isArray(langsCheck) || langsCheck.length === 0) &&
    header.englishLevel.trim() !== ""
  ) {
    candRaw["languages"] = [{ language: "Inglés", level: header.englishLevel }]
  }

  const logoUrl = String(options?.logoUrl ?? "").trim()

  return {
    sheet: payload as Record<string, unknown>,
    header,
    candidate: candRaw,
    vacancy,
    application: (payload.application ??
      payload.applicationInfo ??
      payload.postulation ??
      {}) as Record<string, unknown>,
    match: (payload.match ?? payload.matching ?? {}) as Record<string, unknown>,
    interviews: payload.interviews ?? payload.interviewList ?? [],
    personal: (payload.personal ?? payload.personalData ?? {}) as Record<string, unknown>,
    logoUrl,
  }
}

const TRIPLE_PLACEHOLDER_RE = /\{\{\{\s*([^}\n]+?)\s*\}\}\}/g

function isRawHtmlPlaceholder(path: string, marker: "triple" | "double"): boolean {
  if (marker === "triple") return true
  return /Html$/i.test(path.trim())
}

function substitutePlaceholder(
  pathStr: string,
  context: Record<string, unknown>,
  marker: "triple" | "double",
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
  if (isRawHtmlPlaceholder(trimmed, marker)) return text
  return escapeHtmlForTechnicalSheet(text)
}

export function interpolateTechnicalSheetTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  const withTriple = template.replace(TRIPLE_PLACEHOLDER_RE, (_full, pathStr: string) =>
    substitutePlaceholder(pathStr, context, "triple", _full)
  )
  return withTriple.replace(PLACEHOLDER_RE, (_full, pathStr: string) =>
    substitutePlaceholder(pathStr, context, "double", _full)
  )
}
