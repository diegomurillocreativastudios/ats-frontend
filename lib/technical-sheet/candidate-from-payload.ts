import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"

/**
 * Ignores empty `{}` and objects whose properties are all null, undefined, or blank strings,
 * so a placeholder `personalData: {}` does not hide a populated `candidate` object.
 */
const isMeaningfulObjectRecord = (v: unknown): v is Record<string, unknown> => {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return false
  const o = v as Record<string, unknown>
  const keys = Object.keys(o).filter((k) => !k.toLowerCase().startsWith("additionalprop"))
  if (keys.length === 0) return false
  return keys.some((k) => {
    const val = o[k]
    if (val == null) return false
    if (typeof val === "string" && val.trim() === "") return false
    if (Array.isArray(val)) return val.length > 0
    if (typeof val === "object" && !Array.isArray(val)) {
      return Object.keys(val as object).length > 0
    }
    return true
  })
}

const pickObject = (
  p: TechnicalSheetPayload,
  keys: (keyof TechnicalSheetPayload)[]
): Record<string, unknown> | null => {
  for (const k of keys) {
    const v = p[k]
    if (isMeaningfulObjectRecord(v)) {
      return v
    }
  }
  return null
}

const TECHNICAL_SHEET_SIBLING_KEYS = new Set([
  "generatedAtUtc",
  "vacancy",
  "vacancyInfo",
  "application",
  "applicationInfo",
  "postulation",
  "match",
  "matching",
  "interviews",
  "interviewList",
])

const stripSheetEnvelopeKeys = (root: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...root }
  for (const k of TECHNICAL_SHEET_SIBLING_KEYS) {
    delete out[k]
  }
  return out
}

/**
 * True when the JSON root is a candidate profile (API sin envoltorio `candidate`).
 */
const isRootCandidateProfileShape = (root: Record<string, unknown>): boolean => {
  const nestedCandidate = root.candidate
  if (nestedCandidate != null && typeof nestedCandidate === "object" && !Array.isArray(nestedCandidate)) {
    return false
  }
  const cpId = root.candidateProfileId
  const fn = root.firstName
  const ln = root.lastName
  const hasProfileId = typeof cpId === "string" && cpId.trim() !== ""
  const hasFullName =
    typeof fn === "string" &&
    fn.trim() !== "" &&
    typeof ln === "string" &&
    ln.trim() !== ""
  if (!hasProfileId && !hasFullName) return false
  return isMeaningfulObjectRecord(stripSheetEnvelopeKeys(root))
}

/**
 * Objeto candidato: anidado (`candidate` / `personal`) o el propio root si ya viene plano.
 */
export function pickCandidateDisplayRecord(
  payload: TechnicalSheetPayload
): Record<string, unknown> | null {
  const nested = pickObject(payload, ["personalData", "personal", "candidate"])
  if (nested) return nested
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null
  const root = payload as Record<string, unknown>
  if (!isRootCandidateProfileShape(root)) return null
  return stripSheetEnvelopeKeys(root)
}

function trimUnknownDisplayPart(v: unknown): string {
  if (v == null) return ""
  const s = typeof v === "string" ? v : String(v)
  return s.trim()
}

/**
 * Nombre completo, dirección e inglés desde el payload de la ficha (mismo criterio que el preview).
 */
export function getTechnicalSheetCandidateHeaderFacts(
  payload: TechnicalSheetPayload
): { fullName: string; address: string; englishLevel: string } | null {
  const personal = pickCandidateDisplayRecord(payload)
  if (!personal) return null
  const fullName = [trimUnknownDisplayPart(personal.firstName), trimUnknownDisplayPart(personal.lastName)]
    .filter(Boolean)
    .join(" ")
  const address = trimUnknownDisplayPart(personal.address)
  const englishLevel = trimUnknownDisplayPart(personal.englishLevel)
  return { fullName, address, englishLevel }
}
