/**
 * Tipos y utilidades para GET /api/candidate/me (CandidateSelfProfileDto).
 */

export interface CandidateLatestResumeDto {
  documentId: string | null
  storagePath: string | null
  normalizedData: unknown
  rawText: string | null
  createdAt: string | null
}

export interface CandidateSelfProfileDto {
  email?: string | null
  phoneNumber?: string | null
  userName?: string | null
  latestResume?: CandidateLatestResumeDto | null
  resumeMarkdown?: string | null
  compliance?: unknown
  [key: string]: unknown
}

const ACCOUNT_KEYS = new Set([
  "email",
  "phoneNumber",
  "userName",
  "latestResume",
])

/** No mezclar en normalizedData (peso o irrelevante para el formulario). */
const SELF_PROFILE_MERGE_SKIP_KEYS = new Set([
  "embedding",
  "userId",
  "createdAt",
  "updatedAt",
  "isBanned",
  "banReason",
  "isDeleted",
  "deletedAt",
])

/**
 * Misma lógica que en portal RRHH: normalizedData puede ser objeto o string JSON.
 */
export const parseNormalizedDataField = (rawNd: unknown) => {
  if (rawNd == null) {
    return { normalizedData: {} as Record<string, unknown>, rawString: null as string | null, parseFailed: false }
  }
  if (typeof rawNd === "object" && rawNd !== null && !Array.isArray(rawNd)) {
    return {
      normalizedData: rawNd as Record<string, unknown>,
      rawString: null as string | null,
      parseFailed: false,
    }
  }
  if (typeof rawNd === "string") {
    const trimmed = rawNd.trim()
    if (!trimmed) {
      return { normalizedData: {} as Record<string, unknown>, rawString: null as string | null, parseFailed: false }
    }
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          normalizedData: parsed as Record<string, unknown>,
          rawString: null as string | null,
          parseFailed: false,
        }
      }
      return {
        normalizedData: {} as Record<string, unknown>,
        rawString: trimmed,
        parseFailed: true,
      }
    } catch {
      return {
        normalizedData: {} as Record<string, unknown>,
        rawString: trimmed,
        parseFailed: true,
      }
    }
  }
  return {
    normalizedData: {} as Record<string, unknown>,
    rawString: String(rawNd),
    parseFailed: true,
  }
}

/**
 * Combina latestResume.normalizedData con campos de perfil a nivel raíz del DTO
 * (resumeMarkdown, compliance, etc.), excluyendo datos de cuenta.
 */
export const mergeSelfProfileToNormalized = (
  raw: Record<string, unknown>
): Record<string, unknown> => {
  const nd: Record<string, unknown> = {}
  const resume = raw.latestResume as Record<string, unknown> | undefined
  if (resume?.normalizedData != null) {
    const { normalizedData } = parseNormalizedDataField(resume.normalizedData)
    Object.assign(nd, normalizedData)
  }
  for (const [key, value] of Object.entries(raw)) {
    if (ACCOUNT_KEYS.has(key)) continue
    if (SELF_PROFILE_MERGE_SKIP_KEYS.has(key)) continue
    if (value === undefined) continue
    nd[key] = value
  }
  return nd
}

export interface SelfResumeParseState {
  normalizedDataRaw: string | null
  normalizedDataParseFailed: boolean
}

/**
 * Quita vectores y campos redundantes que el backend puede enviar en `/api/candidate/me`.
 */
export const sanitizeCandidateSelfProfileDto = (
  raw: CandidateSelfProfileDto
): CandidateSelfProfileDto => {
  if (raw == null || typeof raw !== "object") return raw
  const {
    embedding: _emb,
    userId: _uid,
    createdAt: _ca,
    updatedAt: _ua,
    isBanned: _ib,
    banReason: _br,
    isDeleted: _idl,
    deletedAt: _da,
    ...rest
  } = raw as Record<string, unknown>
  return rest as CandidateSelfProfileDto
}

export const getLatestResumeParseState = (
  raw: Record<string, unknown>
): SelfResumeParseState => {
  const resume = raw.latestResume as Record<string, unknown> | undefined
  if (!resume?.normalizedData) {
    return { normalizedDataRaw: null, normalizedDataParseFailed: false }
  }
  const { rawString, parseFailed } = parseNormalizedDataField(resume.normalizedData)
  return {
    normalizedDataRaw: rawString,
    normalizedDataParseFailed: parseFailed,
  }
}
