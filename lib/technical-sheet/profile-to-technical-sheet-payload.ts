import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"
import type { CandidateProfile } from "@/lib/candidate-profile"
import {
  eduRowFromObj,
  langRowFromObj,
  linesToSkillsArray,
  normalizeObjectArray,
  parseSkillsToLines,
  workRowFromObj,
} from "@/lib/candidate-profile-structured"
import {
  mergeRecruiterNormalizedWithCanonicalProfile,
  pickEmbeddedCanonicalProfile,
} from "@/lib/recruiter-canonical-profile-merge"
import {
  extractRecruiterCandidateDetail,
  type RecruiterCandidateDetailState,
} from "@/lib/recruiter-candidate-profile-api"

const trimStr = (v: unknown): string => {
  if (v == null) return ""
  return String(v).trim()
}

function pickStr(...values: unknown[]): string {
  for (const v of values) {
    const t = trimStr(v)
    if (t) return t
  }
  return ""
}

function firstNonEmptyRaw(...sources: unknown[]): unknown {
  for (const source of sources) {
    if (!Array.isArray(source)) continue
    if (source.length > 0) return source
  }
  for (const source of sources) {
    if (Array.isArray(source)) return source
  }
  return []
}

function formatSalaryExpectation(value: unknown): string {
  if (value == null || value === "") return ""
  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value)
  }
  const n = Number(value)
  if (!Number.isNaN(n)) return String(n)
  return trimStr(value)
}

function readJobPreferences(nd: Record<string, unknown>): Record<string, unknown> {
  const jp = nd.JobPreferences ?? nd.jobPreferences
  if (jp != null && typeof jp === "object" && !Array.isArray(jp)) {
    return jp as Record<string, unknown>
  }
  return {}
}

function mapWorkExperience(raw: unknown): Record<string, unknown>[] {
  return normalizeObjectArray(raw).map((item) => {
    const row = workRowFromObj(item)
    return {
      company: row.company,
      role: row.role,
      startDate: row.startDate,
      endDate: row.endDate,
      description: row.description,
    }
  })
}

function mapEducation(raw: unknown): Record<string, unknown>[] {
  return normalizeObjectArray(raw).map((item) => {
    const row = eduRowFromObj(item)
    return {
      institution: row.institution,
      degree: row.degree,
      startDate: row.startDate,
      endDate: row.endDate,
    }
  })
}

function mapLanguages(raw: unknown): Record<string, unknown>[] {
  return normalizeObjectArray(raw).map((item) => {
    const row = langRowFromObj(item)
    return {
      language: row.language,
      level: row.level,
    }
  })
}

function mapSkills(raw: unknown): string[] {
  return linesToSkillsArray(parseSkillsToLines(raw))
}

function deriveEnglishLevelFromLanguages(
  languages: Record<string, unknown>[]
): string {
  for (const lang of languages) {
    const name = pickStr(lang.language, lang.Language, lang.name, lang.Name).toLowerCase()
    if (!name.includes("ingl") && !name.includes("english")) continue
    return pickStr(lang.level, lang.Level)
  }
  return ""
}

/**
 * Builds a technical-sheet payload from the recruiter candidate detail already
 * loaded on `/portal-rrhh/candidatos/[id]` (normalizedData + optional canonical profile).
 * Used by preview and by the profile PDF route so both share one mapping.
 */
export function buildTechnicalSheetPayloadFromRecruiterProfile(input: {
  candidateId?: string | null
  profile: RecruiterCandidateDetailState | null | undefined
  canonicalProfile?: CandidateProfile | null
}): TechnicalSheetPayload {
  const nd = { ...(input.profile?.normalizedData ?? {}) } as Record<string, unknown>
  const canonical = input.canonicalProfile ?? null
  const jp = readJobPreferences(nd)

  const firstName = pickStr(
    canonical?.firstName,
    nd.FirstName,
    nd.firstName
  )
  const lastName = pickStr(canonical?.lastName, nd.LastName, nd.lastName)
  const country = pickStr(canonical?.country, nd.Country, nd.country)
  const profileSummary = pickStr(canonical?.summary, nd.Summary, nd.summary)
  const availability = pickStr(
    canonical?.availability,
    nd.Availability,
    nd.availability,
    jp.Availability,
    jp.availability
  )
  const workMode = pickStr(
    nd.WorkMode,
    nd.workMode,
    jp.WorkMode,
    jp.workMode,
    jp.DesiredWorkMode,
    jp.desiredWorkMode
  )
  const salaryExpectation = formatSalaryExpectation(
    canonical?.minSalary ??
      nd.MinSalary ??
      nd.minSalary ??
      jp.MinSalary ??
      jp.minSalary
  )

  const birthCity = pickStr(
    canonical?.birthCity,
    nd.BirthCity,
    nd.birthCity
  )
  const desiredCity = pickStr(jp.DesiredCity, jp.desiredCity)
  const address = pickStr(
    nd.Address,
    nd.address,
    [country, desiredCity || birthCity].filter(Boolean).join(", ")
  )

  const workExperience = mapWorkExperience(
    firstNonEmptyRaw(
      canonical?.workExperience,
      nd.WorkExperience,
      nd.workExperience
    )
  )
  const education = mapEducation(
    firstNonEmptyRaw(canonical?.education, nd.Education, nd.education)
  )
  const languages = mapLanguages(
    firstNonEmptyRaw(canonical?.languages, nd.Languages, nd.languages)
  )
  const technicalSkills = mapSkills(
    firstNonEmptyRaw(canonical?.skills, nd.Skills, nd.skills)
  )
  const softSkills = mapSkills(nd.SoftSkills ?? nd.softSkills)
  const certifications = normalizeObjectArray(
    firstNonEmptyRaw(nd.Certifications, nd.certifications)
  )

  const englishLevel = pickStr(
    nd.EnglishLevel,
    nd.englishLevel,
    deriveEnglishLevelFromLanguages(languages)
  )

  const candidateProfileId = pickStr(
    input.candidateId,
    input.profile?.id,
    canonical?.id
  )

  const candidate: Record<string, unknown> = {
    candidateProfileId,
    firstName,
    lastName,
    country,
    address,
    englishLevel,
    profileSummary,
    availability,
    workMode,
    salaryExpectation,
    workExperience,
    education,
    languages,
    technicalSkills,
    skills: technicalSkills,
    softSkills,
    certifications,
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    candidate,
  }
}

/**
 * Same mapping from raw API responses (server PDF route).
 * Mirrors `useRecruiterCandidateProfile` merge of detail + optional /profile.
 */
export function buildTechnicalSheetPayloadFromRecruiterApiResponses(input: {
  candidateId: string
  detailRaw: unknown
  profileRaw?: unknown | null
}): TechnicalSheetPayload {
  const base = extractRecruiterCandidateDetail(input.detailRaw)
  const root =
    (input.detailRaw as Record<string, unknown> | null | undefined)?.data ?? input.detailRaw
  let canonicalRaw: unknown = input.profileRaw ?? null
  if (!canonicalRaw && root != null && typeof root === "object" && !Array.isArray(root)) {
    canonicalRaw = pickEmbeddedCanonicalProfile(root as Record<string, unknown>)
  }
  const normalized = mergeRecruiterNormalizedWithCanonicalProfile(
    base.normalizedData,
    canonicalRaw
  )
  return buildTechnicalSheetPayloadFromRecruiterProfile({
    candidateId: input.candidateId,
    profile: { ...base, normalizedData: normalized },
    canonicalProfile: null,
  })
}
