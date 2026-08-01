/**
 * POST/GET /api/candidate/auth-consent — autorización y consentimiento del candidato.
 */

import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

/** Must match backend `CandidateAuthConsent:CurrentDocumentVersion`. */
export const CANDIDATE_AUTH_CONSENT_DOCUMENT_VERSION = "v1"

export const CANDIDATE_AUTH_CONSENT_SECTION_IDS = [
  "profileUse",
  "personalData",
  "confidentiality",
  "communications",
  "nonExclusivity",
  "electronicSignature",
  "acceptance",
] as const

export type CandidateAuthConsentSectionId =
  (typeof CANDIDATE_AUTH_CONSENT_SECTION_IDS)[number]

export type CandidateAuthConsentSectionsAccepted = Record<
  CandidateAuthConsentSectionId,
  boolean
>

export interface CandidateAuthConsentSubmitBody {
  documentVersion: string
  documentLocale: string
  sectionsAccepted: CandidateAuthConsentSectionsAccepted
  firstNames: string
  lastNames: string
  signature: string
  identityDocument: string
  phoneCountryIso2: string
  phoneNationalNumber: string
  clientDeclaredDate: string
}

export interface CandidateAuthConsentSubmitResult {
  authAndConsentVerification: boolean
  authAndConsentVerifiedAt: string | null
  documentVersion: string
  consentId: string
}

export interface CandidateAuthConsentStatus {
  authAndConsentVerification: boolean
  authAndConsentVerifiedAt: string | null
  currentDocumentVersion: string
  acceptedDocumentVersion: string | null
  requiresReacceptance: boolean
}

export type CandidateAuthConsentErrorCode =
  | "AUTH_CONSENT_VALIDATION"
  | "AUTH_CONSENT_VERSION_MISMATCH"
  | "AUTH_CONSENT_NATIONAL_ID_CONFLICT"
  | "AUTH_CONSENT_PROFILE_NOT_FOUND"
  | "AUTH_CONSENT_FORBIDDEN"
  | "UNKNOWN"

const toNullableString = (value: unknown): string | null => {
  if (value == null) return null
  const s = String(value).trim()
  return s === "" ? null : s
}

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (value === true) return true
  if (value === false) return false
  return fallback
}

export function getApiErrorCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null
  const body = "body" in err ? (err as { body?: unknown }).body : undefined
  if (typeof body !== "object" || body === null) return null
  const code = (body as Record<string, unknown>).code
  return typeof code === "string" && code.trim() !== "" ? code.trim() : null
}

export function normalizeCandidateAuthConsentStatus(
  raw: unknown
): CandidateAuthConsentStatus {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      authAndConsentVerification: false,
      authAndConsentVerifiedAt: null,
      currentDocumentVersion: CANDIDATE_AUTH_CONSENT_DOCUMENT_VERSION,
      acceptedDocumentVersion: null,
      requiresReacceptance: true,
    }
  }
  const o = raw as Record<string, unknown>
  return {
    authAndConsentVerification: toBoolean(o.authAndConsentVerification),
    authAndConsentVerifiedAt: toNullableString(o.authAndConsentVerifiedAt),
    currentDocumentVersion:
      toNullableString(o.currentDocumentVersion) ??
      CANDIDATE_AUTH_CONSENT_DOCUMENT_VERSION,
    acceptedDocumentVersion: toNullableString(o.acceptedDocumentVersion),
    requiresReacceptance: toBoolean(o.requiresReacceptance, true),
  }
}

export function normalizeCandidateAuthConsentSubmitResult(
  raw: unknown
): CandidateAuthConsentSubmitResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      authAndConsentVerification: false,
      authAndConsentVerifiedAt: null,
      documentVersion: CANDIDATE_AUTH_CONSENT_DOCUMENT_VERSION,
      consentId: "",
    }
  }
  const o = raw as Record<string, unknown>
  return {
    authAndConsentVerification: toBoolean(o.authAndConsentVerification),
    authAndConsentVerifiedAt: toNullableString(o.authAndConsentVerifiedAt),
    documentVersion:
      toNullableString(o.documentVersion) ??
      CANDIDATE_AUTH_CONSENT_DOCUMENT_VERSION,
    consentId: toNullableString(o.consentId) ?? "",
  }
}

export async function fetchCandidateAuthConsentStatus(): Promise<CandidateAuthConsentStatus> {
  const raw = await apiClient.get("/api/candidate/auth-consent")
  return normalizeCandidateAuthConsentStatus(raw)
}

export async function submitCandidateAuthConsent(
  body: CandidateAuthConsentSubmitBody
): Promise<CandidateAuthConsentSubmitResult> {
  const raw = await apiClient.post("/api/candidate/auth-consent", body)
  return normalizeCandidateAuthConsentSubmitResult(raw)
}

export function mapCandidateAuthConsentError(
  err: unknown
): { code: CandidateAuthConsentErrorCode; message: string; status: number } {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status: number }).status)
      : 0
  const apiCode = getApiErrorCode(err)
  const message = getApiErrorMessage(err)

  if (apiCode === "AUTH_CONSENT_VALIDATION" || status === 400) {
    return { code: "AUTH_CONSENT_VALIDATION", message, status: status || 400 }
  }
  if (apiCode === "AUTH_CONSENT_NATIONAL_ID_CONFLICT") {
    return {
      code: "AUTH_CONSENT_NATIONAL_ID_CONFLICT",
      message,
      status: status || 409,
    }
  }
  if (apiCode === "AUTH_CONSENT_VERSION_MISMATCH") {
    return {
      code: "AUTH_CONSENT_VERSION_MISMATCH",
      message,
      status: status || 409,
    }
  }
  if (status === 409) {
    return {
      code: "AUTH_CONSENT_NATIONAL_ID_CONFLICT",
      message,
      status: 409,
    }
  }
  if (apiCode === "AUTH_CONSENT_PROFILE_NOT_FOUND" || status === 404) {
    return {
      code: "AUTH_CONSENT_PROFILE_NOT_FOUND",
      message,
      status: status || 404,
    }
  }
  if (apiCode === "AUTH_CONSENT_FORBIDDEN" || status === 403) {
    return { code: "AUTH_CONSENT_FORBIDDEN", message, status: status || 403 }
  }
  return { code: "UNKNOWN", message, status }
}
