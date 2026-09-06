import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"
import {
  getTechnicalSheetCandidateHeaderFacts,
  pickCandidateDisplayRecord,
} from "@/lib/technical-sheet/candidate-from-payload"

/**
 * Contexto de plantilla de ficha (sin DOMPurify/jsdom).
 * Separado de `template-interpolate` para que PDFKit no cargue sanitizers en cold start.
 */

export interface TechnicalSheetTemplateContextOptions {
  vacancyTitleFallback?: string | null
  /**
   * URL absoluta del logo (p. ej. `https://tu-dominio.com/Applican_Tree.svg`).
   * Necesaria en plantillas renderizadas en iframe `srcDoc`, donde `/ruta` no resuelve contra el origen de la app.
   */
  logoUrl?: string | null
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
