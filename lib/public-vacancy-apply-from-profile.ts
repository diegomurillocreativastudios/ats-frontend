/**
 * Map / readiness helpers: candidate profile → public vacancy apply fields.
 */

import type { CandidateProfile } from "@/lib/candidate-profile"
import {
  normalizeObjectArray,
  socialRowFromObj,
} from "@/lib/candidate-profile-structured"

export const DEFAULT_APPLY_PHONE_COUNTRY_ISO2 = "SV"

export interface PublicApplyProfileFields {
  firstName: string
  lastName: string
  email: string
  phone: string
  phoneCountryIso2: string
  documentTypeId: string
  nationalId: string
  linkedinUrl: string
  websiteUrl: string
}

function trimStr(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

/** ISO2 de 2 letras desde `profile.country`, o el default del portal. */
export function resolveApplyPhoneCountryIso2(
  country: string | null | undefined,
  fallback = DEFAULT_APPLY_PHONE_COUNTRY_ISO2
): string {
  const raw = trimStr(country).toUpperCase()
  if (/^[A-Z]{2}$/.test(raw)) return raw
  return fallback
}

function extractSocialUrls(socialLinks: unknown): {
  linkedinUrl: string
  websiteUrl: string
} {
  const rows = normalizeObjectArray(socialLinks).map(socialRowFromObj)
  let linkedinUrl = ""
  let websiteUrl = ""

  for (const row of rows) {
    const platform = row.platform.trim().toLowerCase()
    const url = row.url.trim()
    if (!url) continue

    const isLinkedin =
      platform.includes("linkedin") || /linkedin\.com/i.test(url)
    if (isLinkedin && !linkedinUrl) {
      linkedinUrl = url
      continue
    }

    const isWebsite =
      platform.includes("web") ||
      platform.includes("site") ||
      platform.includes("portfolio") ||
      platform === "url"
    if (isWebsite && !websiteUrl && !/linkedin\.com/i.test(url)) {
      websiteUrl = url
    }
  }

  if (!websiteUrl) {
    for (const row of rows) {
      const url = row.url.trim()
      if (!url || /linkedin\.com/i.test(url)) continue
      websiteUrl = url
      break
    }
  }

  return { linkedinUrl, websiteUrl }
}

/** Campos de formulario / appliance derivados del perfil del candidato. */
export function mapCandidateProfileToApplyFields(
  profile: CandidateProfile
): PublicApplyProfileFields {
  const { linkedinUrl, websiteUrl } = extractSocialUrls(profile.socialLinks)
  return {
    firstName: trimStr(profile.firstName),
    lastName: trimStr(profile.lastName),
    email: trimStr(profile.email),
    phone: trimStr(profile.phoneNumber),
    phoneCountryIso2: resolveApplyPhoneCountryIso2(profile.country),
    documentTypeId: trimStr(profile.identityDocumentTypeId),
    nationalId: trimStr(profile.nationalId),
    linkedinUrl,
    websiteUrl,
  }
}

/** True si el perfil tiene lo mínimo para postular sin formulario largo. */
export function isProfileReadyForQuickApply(
  profile: CandidateProfile | null | undefined
): boolean {
  if (!profile) return false
  if (profile.hasCvFile !== true) return false
  const fields = mapCandidateProfileToApplyFields(profile)
  return (
    fields.firstName !== "" &&
    fields.lastName !== "" &&
    fields.email !== "" &&
    fields.phone !== "" &&
    fields.nationalId !== "" &&
    fields.documentTypeId !== ""
  )
}

/** Consent vigente para la versión actual del documento. */
export function isApplyConsentCurrent(status: {
  authAndConsentVerification: boolean
  requiresReacceptance: boolean
} | null | undefined): boolean {
  if (!status) return false
  return (
    status.authAndConsentVerification === true &&
    status.requiresReacceptance !== true
  )
}
