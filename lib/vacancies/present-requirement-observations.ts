import type {
  RequirementAssessmentView,
  RequirementVerdict,
} from "@/lib/vacancies/build-attribute-table-rows"

export const NO_MET_REQUIREMENTS_NOTE =
  "Por ahora no hay requisitos cumplidos que resaltar."

export const NO_GAP_REQUIREMENTS_NOTE =
  "No hay brechas destacables en los requisitos revisados."

const NEGATIVE_REASON_KEYS = ["negativeReasons", "NegativeReasons", "negative_reasons"] as const

export interface ObservationRow {
  key: string
  title: string
  verdict: RequirementVerdict
  body: string
}

export type ObservationPresentation =
  | { kind: "empty-note"; text: string }
  | { kind: "prose"; text: string }
  | { kind: "rows"; rows: ObservationRow[] }

/**
 * Requirement key shown as a row title. Underscores become spaces; the name is not rewritten.
 */
export function formatObservationTitle(key: string): string {
  return key.replace(/_/g, " ")
}

/**
 * Turns one checklist paragraph into one row per assessment, in list order.
 * A failed split returns the paragraph unchanged.
 */
export function presentRequirementObservations(
  paragraph: string,
  assessments: RequirementAssessmentView[],
  emptyNote: string
): ObservationPresentation {
  const text = paragraph.trim()
  if (text === emptyNote) return { kind: "empty-note", text }

  if (assessments.length === 0) return { kind: "prose", text }

  const bodies = splitObservationBodies(
    text,
    assessments.map((assessment) => assessment.key)
  )
  if (bodies == null) return { kind: "prose", text }

  return {
    kind: "rows",
    rows: assessments.map((assessment, index) => ({
      key: assessment.key,
      title: formatObservationTitle(assessment.key),
      verdict: assessment.verdict,
      body: bodies[index] ?? "",
    })),
  }
}

/**
 * Failed hard-gate messages already on the match, in array order.
 * Qualitative reasons stay out: they are the checklist paragraphs.
 */
export function pickHardGateMessages(source: unknown): string[] {
  if (source == null || typeof source !== "object" || Array.isArray(source)) return []
  const record = source as Record<string, unknown>
  const raw = NEGATIVE_REASON_KEYS.map((key) => record[key]).find(Array.isArray)
  if (!Array.isArray(raw)) return []

  return raw.flatMap((item) => {
    if (item == null || typeof item !== "object" || Array.isArray(item)) return []
    const entry = item as Record<string, unknown>
    const sourceName = entry.source ?? entry.Source
    if (sourceName !== "hard_gate") return []
    const message = entry.message ?? entry.Message
    if (typeof message !== "string") return []
    const text = message.trim()
    return text === "" ? [] : [text]
  })
}

function splitObservationBodies(text: string, keys: string[]): string[] | null {
  const firstMarker = `${keys[0]}: `
  if (!text.startsWith(firstMarker)) return null

  const bodies: string[] = []
  let bodyStart = firstMarker.length

  for (let index = 1; index < keys.length; index += 1) {
    const boundary = ` ${keys[index]}: `
    const boundaryAt = text.indexOf(boundary, bodyStart)
    if (boundaryAt === -1) return null
    const body = text.slice(bodyStart, boundaryAt).trim()
    if (body === "") return null
    bodies.push(body)
    bodyStart = boundaryAt + boundary.length
  }

  const lastBody = text.slice(bodyStart).trim()
  if (lastBody === "") return null
  bodies.push(lastBody)
  return bodies.length === keys.length ? bodies : null
}
