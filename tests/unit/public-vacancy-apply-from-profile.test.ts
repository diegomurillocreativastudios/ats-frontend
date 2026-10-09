import { describe, expect, it } from "vitest"
import {
  isApplyConsentCurrent,
  isProfileReadyForQuickApply,
  mapCandidateProfileToApplyFields,
  resolveApplyPhoneCountryIso2,
} from "@/lib/public-vacancy-apply-from-profile"
import type { CandidateProfile } from "@/lib/candidate-profile"

function baseProfile(
  overrides: Partial<CandidateProfile> = {}
): CandidateProfile {
  return {
    id: "cand-1",
    firstName: "Ana",
    lastName: "López",
    headline: "",
    summary: "",
    resumeMarkdown: "",
    nationalId: "01234567-8",
    identityDocumentTypeId: "11111111-1111-1111-1111-111111111111",
    email: "ana@example.com",
    phoneNumber: "77778888",
    hasCvFile: true,
    ...overrides,
  }
}

describe("public-vacancy-apply-from-profile", () => {
  it("maps profile fields and social links", () => {
    const fields = mapCandidateProfileToApplyFields(
      baseProfile({
        country: "us",
        socialLinks: [
          { platform: "LinkedIn", url: "https://linkedin.com/in/ana" },
          { platform: "Website", url: "https://ana.dev" },
        ],
      })
    )
    expect(fields).toMatchObject({
      firstName: "Ana",
      lastName: "López",
      email: "ana@example.com",
      phone: "77778888",
      phoneCountryIso2: "US",
      documentTypeId: "11111111-1111-1111-1111-111111111111",
      nationalId: "01234567-8",
      linkedinUrl: "https://linkedin.com/in/ana",
      websiteUrl: "https://ana.dev",
    })
  })

  it("requires minimum fields and CV for quick apply", () => {
    expect(isProfileReadyForQuickApply(baseProfile())).toBe(true)
    expect(
      isProfileReadyForQuickApply(baseProfile({ hasCvFile: false }))
    ).toBe(false)
    expect(
      isProfileReadyForQuickApply(baseProfile({ phoneNumber: "" }))
    ).toBe(false)
    expect(
      isProfileReadyForQuickApply(
        baseProfile({ identityDocumentTypeId: null })
      )
    ).toBe(false)
    expect(isProfileReadyForQuickApply(null)).toBe(false)
  })

  it("treats consent as current only when verified and not requiring reacceptance", () => {
    expect(
      isApplyConsentCurrent({
        authAndConsentVerification: true,
        requiresReacceptance: false,
      })
    ).toBe(true)
    expect(
      isApplyConsentCurrent({
        authAndConsentVerification: true,
        requiresReacceptance: true,
      })
    ).toBe(false)
    expect(
      isApplyConsentCurrent({
        authAndConsentVerification: false,
        requiresReacceptance: false,
      })
    ).toBe(false)
  })

  it("defaults phone country to SV when country is not ISO2", () => {
    expect(resolveApplyPhoneCountryIso2("El Salvador")).toBe("SV")
    expect(resolveApplyPhoneCountryIso2("sv")).toBe("SV")
  })
})
