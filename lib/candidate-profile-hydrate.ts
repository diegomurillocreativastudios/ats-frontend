import type { CandidateProfile, FullProfileFormInput } from "@/lib/candidate-profile"
import { isoDateToDateInputValue } from "@/lib/candidate-profile"
import {
  eduRowFromObj,
  emptyEduRow,
  emptyLangRow,
  emptyRefRow,
  emptyWorkRow,
  langRowFromObj,
  normalizeObjectArray,
  parseJsonObjectIfString,
  parseRecognitionsToLines,
  parseSkillsToLines,
  refRowFromObj,
  socialRowFromObj,
  str,
  workRowFromObj,
} from "@/lib/candidate-profile-structured"

const firstDefined = (...vals: unknown[]) => {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== "") return v
  }
  return undefined
}

/** Titular en pantalla: `headline` o, si viene vacío, `jobPreferences.DesiredRole`. */
export const resolveHeadlineForDisplay = (
  profile: CandidateProfile | null | undefined
): string => {
  if (!profile) return ""
  const h = str(profile.headline).trim()
  if (h) return h
  const jp = parseJsonObjectIfString(profile.jobPreferences)
  return str(jp?.DesiredRole ?? jp?.desiredRole).trim()
}

export const buildFullFormStateFromSources = (
  profile: CandidateProfile | null,
  nd: Record<string, unknown>
): FullProfileFormInput => {
  const p = profile
  const jobPrefs = parseJsonObjectIfString(
    firstDefined(p?.jobPreferences, nd.JobPreferences, nd.jobPreferences)
  )

  const sectors = (() => {
    const s = jobPrefs?.Sectors ?? jobPrefs?.sectors
    if (Array.isArray(s))
      return s.map((x) => String(x).trim()).filter(Boolean)
    return [] as string[]
  })()

  const workRaw = firstDefined(p?.workExperience, nd.WorkExperience, nd.workExperience)
  let workRows = normalizeObjectArray(workRaw).map(workRowFromObj)
  if (workRows.length === 0) workRows = [emptyWorkRow()]

  const eduRaw = firstDefined(p?.education, nd.Education, nd.education)
  let educationRows = normalizeObjectArray(eduRaw).map(eduRowFromObj)
  if (educationRows.length === 0) educationRows = [emptyEduRow()]

  const langRaw = firstDefined(p?.languages, nd.Languages, nd.languages)
  let languageRows = normalizeObjectArray(langRaw).map(langRowFromObj)
  if (languageRows.length === 0) languageRows = [emptyLangRow()]

  const skillsRaw = firstDefined(p?.skills, nd.Skills, nd.skills)
  const skillsText = p?.skills != null ? parseSkillsToLines(p.skills) : parseSkillsToLines(skillsRaw)

  const socialRaw = firstDefined(p?.socialLinks, nd.SocialLinks, nd.socialLinks)
  let socialRows = normalizeObjectArray(socialRaw).map(socialRowFromObj)
  if (socialRows.length === 0) socialRows = []

  const videoLink = str(firstDefined(p?.videoLink, nd.VideoLink, nd.videoLink))

  const refRaw = firstDefined(p?.references, nd.References, nd.references)
  let referenceRows = normalizeObjectArray(refRaw).map(refRowFromObj)
  if (referenceRows.length === 0) referenceRows = [emptyRefRow()]

  const recogRaw = firstDefined(p?.recognitions, nd.Recognitions, nd.recognitions)
  const recognitionsText =
    p?.recognitions != null ? parseRecognitionsToLines(p.recognitions) : parseRecognitionsToLines(recogRaw)

  const email = str(firstDefined(p?.email, nd.Email, nd.email))
  const phoneNumber = str(firstDefined(p?.phoneNumber, nd.PhoneNumber, nd.phoneNumber, nd.phone))

  let jobDisability: "" | "yes" | "no" = ""
  const dr = jobPrefs?.Disability ?? jobPrefs?.disability
  if (dr === true) jobDisability = "yes"
  else if (dr === false) jobDisability = "no"
  else if (p?.hasDisability === true) jobDisability = "yes"
  else if (p?.hasDisability === false) jobDisability = "no"

  const headlineRaw = str(p?.headline)
  const desiredRoleFallback = str(jobPrefs?.DesiredRole ?? jobPrefs?.desiredRole)
  const headline =
    headlineRaw.trim() !== "" ? headlineRaw : desiredRoleFallback

  return {
    headline,
    summary: p?.summary ?? str(nd.Summary ?? nd.summary),
    resumeMarkdown: p?.resumeMarkdown ?? str(nd.resumeMarkdown),
    nationalId: p?.nationalId ?? "",
    firstName: p?.firstName ?? str(nd.FirstName ?? nd.firstName) ?? "",
    lastName: p?.lastName ?? str(nd.LastName ?? nd.lastName) ?? "",
    country: p?.country ?? str(nd.Country ?? nd.country) ?? "",
    birthDateInput: isoDateToDateInputValue(p?.birthDate ?? (nd.BirthDate ?? nd.birthDate) as string | undefined),
    birthCity: p?.birthCity ?? str(nd.BirthCity ?? nd.birthCity) ?? "",
    maritalStatus: p?.maritalStatus ?? str(nd.MaritalStatus ?? nd.maritalStatus) ?? "",
    gender: p?.gender ?? str(nd.Gender ?? nd.gender) ?? "",
    minSalary:
      p?.minSalary != null && !Number.isNaN(Number(p.minSalary)) ? String(p.minSalary) : "",
    availability: p?.availability ?? "",
    hasDisabilityChoice:
      p?.hasDisability === true ? "yes" : p?.hasDisability === false ? "no" : "",
    email,
    phoneNumber,
    videoLink,
    sectors,
    jobDesiredRole: str(jobPrefs?.DesiredRole ?? jobPrefs?.desiredRole),
    jobMinSalary: (() => {
      const fromPrefs =
        jobPrefs?.MinSalary != null || jobPrefs?.minSalary != null
          ? String(jobPrefs.MinSalary ?? jobPrefs.minSalary ?? "")
          : ""
      if (fromPrefs !== "") return fromPrefs
      return p?.minSalary != null && !Number.isNaN(Number(p.minSalary))
        ? String(p.minSalary)
        : ""
    })(),
    jobEducationLevel: str(jobPrefs?.EducationLevel ?? jobPrefs?.educationLevel),
    jobDesiredCity: str(jobPrefs?.DesiredCity ?? jobPrefs?.desiredCity),
    jobAvailability: (() => {
      const fromPrefs = str(jobPrefs?.Availability ?? jobPrefs?.availability)
      if (fromPrefs !== "") return fromPrefs
      return p?.availability ?? ""
    })(),
    jobDisability,
    workRows,
    educationRows,
    languageRows,
    skillsText,
    socialRows,
    referenceRows,
    recognitionsText,
  }
}
