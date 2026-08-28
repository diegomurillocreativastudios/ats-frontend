import {
  buildCandidateProfileSaveBody,
  type CandidateProfileSaveBody,
  type FullProfileFormInput,
} from "@/lib/candidate-profile"
import { candidateProfilePayloadToRecruiterNormalizedLayer } from "@/lib/recruiter-canonical-profile-merge"

export interface RecruiterCandidateDetailState {
  id: string | number | null
  normalizedData: Record<string, unknown>
  normalizedDataRaw: string | null
  normalizedDataParseFailed: boolean
}

export interface RecruiterCandidateProfilePutBody {
  normalizedData?: Record<string, unknown>
  candidateProfile: CandidateProfileSaveBody
}

const META_KEYS = new Set([
  "id",
  "documentId",
  "normalizedData",
  "storagePath",
  "storage_path",
  "data",
])

/**
 * GET /api/recruiter/candidates/{id} puede devolver normalizedData como objeto o como string JSON.
 */
export function parseNormalizedDataField(rawNd: unknown): {
  normalizedData: Record<string, unknown>
  rawString: string | null
  parseFailed: boolean
} {
  if (rawNd == null) {
    return { normalizedData: {}, rawString: null, parseFailed: false }
  }
  if (typeof rawNd === "object" && rawNd !== null && !Array.isArray(rawNd)) {
    return { normalizedData: rawNd as Record<string, unknown>, rawString: null, parseFailed: false }
  }
  if (typeof rawNd === "string") {
    const trimmed = rawNd.trim()
    if (!trimmed) {
      return { normalizedData: {}, rawString: null, parseFailed: false }
    }
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { normalizedData: parsed as Record<string, unknown>, rawString: null, parseFailed: false }
      }
      return { normalizedData: {}, rawString: trimmed, parseFailed: true }
    } catch {
      return { normalizedData: {}, rawString: trimmed, parseFailed: true }
    }
  }
  return {
    normalizedData: {},
    rawString: String(rawNd),
    parseFailed: true,
  }
}

/** Respuesta de GET /api/recruiter/candidates/{id}: id, normalizedData (+ candidateProfile embebido). */
export function extractRecruiterCandidateDetail(raw: unknown): RecruiterCandidateDetailState {
  const empty: RecruiterCandidateDetailState = {
    id: null,
    normalizedData: {},
    normalizedDataRaw: null,
    normalizedDataParseFailed: false,
  }
  if (!raw) return empty

  const top = raw as Record<string, unknown>
  const root = (top["data"] ?? top) as Record<string, unknown>
  const id = (root["id"] ?? root["documentId"] ?? null) as string | number | null

  const { normalizedData, rawString, parseFailed } = parseNormalizedDataField(
    root["normalizedData"]
  )

  if (Object.keys(normalizedData).length > 0 || rawString != null) {
    return {
      id,
      normalizedData,
      normalizedDataRaw: rawString,
      normalizedDataParseFailed: parseFailed,
    }
  }

  const hasLegacyKeys =
    root["FirstName"] != null ||
    root["firstName"] != null ||
    root["WorkExperience"] != null ||
    root["workExperience"] != null

  if (hasLegacyKeys) {
    const legacy = { ...root }
    META_KEYS.forEach((k) => {
      delete legacy[k]
    })
    return {
      id,
      normalizedData: legacy,
      normalizedDataRaw: null,
      normalizedDataParseFailed: false,
    }
  }

  return {
    id,
    normalizedData: {},
    normalizedDataRaw: rawString,
    normalizedDataParseFailed: parseFailed,
  }
}

export function buildRecruiterCandidateProfilePutPayload(
  candidateProfile: CandidateProfileSaveBody,
  existingNormalizedData: Record<string, unknown>
): RecruiterCandidateProfilePutBody {
  const layer = candidateProfilePayloadToRecruiterNormalizedLayer(candidateProfile)
  return {
    candidateProfile,
    normalizedData: { ...existingNormalizedData, ...layer },
  }
}

export function buildRecruiterCandidateProfilePutPayloadFromForm(
  form: FullProfileFormInput,
  existingNormalizedData: Record<string, unknown>
): RecruiterCandidateProfilePutBody {
  return buildRecruiterCandidateProfilePutPayload(
    buildCandidateProfileSaveBody(form),
    existingNormalizedData
  )
}
