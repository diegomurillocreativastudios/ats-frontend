import { describe, expect, it } from "vitest"
import {
  CANDIDATE_AUTH_CONSENT_DOCUMENT_VERSION,
  mapCandidateAuthConsentError,
  normalizeCandidateAuthConsentStatus,
  normalizeCandidateAuthConsentSubmitResult,
} from "@/lib/candidate-auth-consent"

describe("candidate-auth-consent", () => {
  it("normalizes consent status from API", () => {
    const status = normalizeCandidateAuthConsentStatus({
      authAndConsentVerification: true,
      authAndConsentVerifiedAt: "2026-07-31T14:22:10.123Z",
      currentDocumentVersion: "v1",
      acceptedDocumentVersion: "v1",
      requiresReacceptance: false,
    })
    expect(status.authAndConsentVerification).toBe(true)
    expect(status.requiresReacceptance).toBe(false)
    expect(status.currentDocumentVersion).toBe("v1")
  })

  it("defaults invalid status payloads to requires reacceptance", () => {
    const status = normalizeCandidateAuthConsentStatus(null)
    expect(status.authAndConsentVerification).toBe(false)
    expect(status.requiresReacceptance).toBe(true)
    expect(status.currentDocumentVersion).toBe(
      CANDIDATE_AUTH_CONSENT_DOCUMENT_VERSION
    )
  })

  it("normalizes submit result", () => {
    const result = normalizeCandidateAuthConsentSubmitResult({
      authAndConsentVerification: true,
      authAndConsentVerifiedAt: "2026-07-31T14:22:10.123Z",
      documentVersion: "v1",
      consentId: "abc",
    })
    expect(result.consentId).toBe("abc")
    expect(result.documentVersion).toBe("v1")
  })

  it("maps API error codes", () => {
    const err = Object.assign(new Error("bad version"), {
      status: 409,
      body: { code: "AUTH_CONSENT_VERSION_MISMATCH", message: "bad version" },
    })
    const mapped = mapCandidateAuthConsentError(err)
    expect(mapped.code).toBe("AUTH_CONSENT_VERSION_MISMATCH")
    expect(mapped.status).toBe(409)
  })

  it("maps national id conflict separately from version mismatch", () => {
    const err = Object.assign(new Error("duplicate id"), {
      status: 409,
      body: {
        code: "AUTH_CONSENT_NATIONAL_ID_CONFLICT",
        message: "duplicate id",
      },
    })
    const mapped = mapCandidateAuthConsentError(err)
    expect(mapped.code).toBe("AUTH_CONSENT_NATIONAL_ID_CONFLICT")
    expect(mapped.status).toBe(409)
  })
})
