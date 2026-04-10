/**
 * GET/PUT /api/candidate/profile — perfil de candidato editable (token JWT).
 * Incluye campos extendidos para trayectoria, contacto y preferencias (si el backend los acepta).
 */

import type {
  EducationRow,
  LanguageRow,
  ReferenceRow,
  SocialRow,
  WorkExperienceRow,
} from "@/lib/candidate-profile-structured"
import {
  eduRowToApi,
  langRowToApi,
  linesToRecognitionsArray,
  linesToSkillsArray,
  refRowToApi,
  socialRowToApi,
  workRowToApi,
} from "@/lib/candidate-profile-structured"

export interface CandidateProfile {
  id: string
  firstName?: string | null
  lastName?: string | null
  headline: string
  summary: string
  resumeMarkdown: string
  nationalId: string
  country?: string | null
  birthDate?: string | null
  birthCity?: string | null
  maritalStatus?: string | null
  gender?: string | null
  minSalary?: number | null
  availability?: string | null
  hasDisability?: boolean | null
  email?: string | null
  phoneNumber?: string | null
  jobPreferences?: unknown
  workExperience?: unknown
  education?: unknown
  languages?: unknown
  skills?: unknown
  socialLinks?: unknown
  videoLink?: string | null
  references?: unknown
  recognitions?: unknown
  /** URL directa al PDF del CV (p. ej. GCS); solo lectura desde GET del perfil. */
  cvDownloadUrl?: string | null
  /** Ruta en storage del CV (mismo criterio que GET `/api/Storage/files/{path}`). */
  storagePath?: string | null
}

const toTrimmedString = (value: unknown): string => {
  if (value == null) return ""
  return String(value).trim()
}

const toNullableString = (value: unknown): string | null => {
  if (value == null) return null
  const s = String(value).trim()
  return s === "" ? null : s
}

const toNullableNumber = (value: unknown): number | null => {
  if (value == null) return null
  if (typeof value === "number" && !Number.isNaN(value)) return value
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

/**
 * GET/PUT del backend pueden incluir `embedding` (vectores) y metadatos que no usa la UI.
 * Los quitamos para no inflar memoria ni el estado de React.
 */
export function normalizeCandidateProfileFromApi(raw: unknown): CandidateProfile {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      id: "",
      headline: "",
      summary: "",
      resumeMarkdown: "",
      nationalId: "",
    }
  }
  const o = raw as Record<string, unknown>
  return {
    id: toTrimmedString(o.id),
    firstName: toNullableString(o.firstName),
    lastName: toNullableString(o.lastName),
    headline: toTrimmedString(o.headline),
    summary: toTrimmedString(o.summary),
    resumeMarkdown: toTrimmedString(o.resumeMarkdown),
    nationalId: toTrimmedString(o.nationalId),
    country: toNullableString(o.country),
    birthDate:
      o.birthDate == null || o.birthDate === ""
        ? null
        : typeof o.birthDate === "string"
          ? o.birthDate
          : null,
    birthCity: toNullableString(o.birthCity),
    maritalStatus: toNullableString(o.maritalStatus),
    gender: toNullableString(o.gender),
    minSalary: toNullableNumber(o.minSalary),
    availability: toNullableString(o.availability),
    hasDisability:
      o.hasDisability === true
        ? true
        : o.hasDisability === false
          ? false
          : null,
    email: toNullableString(o.email),
    phoneNumber: toNullableString(o.phoneNumber),
    jobPreferences: o.jobPreferences ?? null,
    workExperience: o.workExperience ?? null,
    education: o.education ?? null,
    languages: o.languages ?? null,
    skills: o.skills ?? null,
    socialLinks: o.socialLinks ?? null,
    videoLink: toNullableString(o.videoLink),
    references: o.references ?? null,
    recognitions: o.recognitions ?? null,
    cvDownloadUrl: toNullableString(o.cvDownloadUrl),
    storagePath: toNullableString(o.storagePath),
  }
}

const hasTrimmedText = (v: string | null | undefined): boolean =>
  v != null && String(v).trim() !== ""

/**
 * Tras PUT `/api/candidate/profile`, la respuesta puede omitir `storagePath` / `cvDownloadUrl`.
 * Conserva los valores ya cargados para que no desaparezca el botón de descarga.
 */
export function mergeCandidateProfilePreservingCvRefs(
  previous: CandidateProfile | null,
  incoming: CandidateProfile
): CandidateProfile {
  if (!previous) return incoming
  return {
    ...incoming,
    storagePath: hasTrimmedText(incoming.storagePath)
      ? incoming.storagePath
      : previous.storagePath ?? null,
    cvDownloadUrl: hasTrimmedText(incoming.cvDownloadUrl)
      ? incoming.cvDownloadUrl
      : previous.cvDownloadUrl ?? null,
  }
}

const isNonEmptyArray = (v: unknown): boolean => Array.isArray(v) && v.length > 0

const jobPreferencesHasDisplayableContent = (jp: unknown): boolean => {
  if (jp == null || typeof jp !== "object" || Array.isArray(jp)) return false
  for (const v of Object.values(jp as Record<string, unknown>)) {
    if (v == null) continue
    if (Array.isArray(v)) {
      if (v.length > 0) return true
      continue
    }
    if (typeof v === "boolean") return true
    if (typeof v === "number" && !Number.isNaN(v)) return true
    if (typeof v === "string" && v.trim() !== "") return true
  }
  return false
}

/**
 * Hay datos para mostrar secciones enriquecidas (trayectoria, competencias, etc.)
 * solo con GET `/api/candidate/profile`, sin depender de `/api/candidate/me`.
 */
export function candidateProfileHasEnrichedDisplayData(
  p: CandidateProfile | null | undefined
): boolean {
  if (!p) return false
  if (isNonEmptyArray(p.workExperience)) return true
  if (isNonEmptyArray(p.education)) return true
  if (isNonEmptyArray(p.languages)) return true
  if (isNonEmptyArray(p.skills)) return true
  if (isNonEmptyArray(p.socialLinks)) return true
  if (isNonEmptyArray(p.references)) return true
  if (isNonEmptyArray(p.recognitions)) return true
  if (p.videoLink != null && String(p.videoLink).trim() !== "") return true
  if (jobPreferencesHasDisplayableContent(p.jobPreferences)) return true
  return false
}

export interface CandidateProfileSaveBody {
  headline: string
  summary: string
  resumeMarkdown: string
  nationalId: string
  firstName?: string | null
  lastName?: string | null
  country?: string | null
  birthDate?: string | null
  birthCity?: string | null
  maritalStatus?: string | null
  gender?: string | null
  minSalary?: number | null
  availability?: string | null
  hasDisability?: boolean | null
  email?: string | null
  phoneNumber?: string | null
  jobPreferences?: unknown
  workExperience?: unknown
  education?: unknown
  languages?: unknown
  skills?: unknown
  socialLinks?: unknown
  videoLink?: string | null
  references?: unknown
  recognitions?: unknown
}

export const isoDateToDateInputValue = (iso: string | null | undefined): string => {
  if (!iso || typeof iso !== "string") return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export const dateInputValueToIso = (yyyyMmDd: string): string | null => {
  const t = yyyyMmDd.trim()
  if (!t) return null
  const d = new Date(`${t}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

const optStr = (s: string) => {
  const v = s.trim()
  return v === "" ? undefined : v
}

const rowHasContent = (o: Record<string, string>) =>
  Object.values(o).some((x) => String(x).trim() !== "")

export interface FullProfileFormInput {
  headline: string
  summary: string
  resumeMarkdown: string
  nationalId: string
  firstName: string
  lastName: string
  country: string
  birthDateInput: string
  birthCity: string
  maritalStatus: string
  gender: string
  minSalary: string
  availability: string
  hasDisabilityChoice: "" | "yes" | "no"
  email: string
  phoneNumber: string
  videoLink: string
  sectors: string[]
  jobDesiredRole: string
  jobMinSalary: string
  jobEducationLevel: string
  jobDesiredCity: string
  jobAvailability: string
  jobDisability: "" | "yes" | "no"
  workRows: WorkExperienceRow[]
  educationRows: EducationRow[]
  languageRows: LanguageRow[]
  skillsText: string
  socialRows: SocialRow[]
  referenceRows: ReferenceRow[]
  recognitionsText: string
}

const buildJobPreferencesPayload = (input: FullProfileFormInput): Record<string, unknown> | undefined => {
  const o: Record<string, unknown> = {}
  const dr = input.jobDesiredRole.trim()
  const el = input.jobEducationLevel.trim()
  const dc = input.jobDesiredCity.trim()
  const ja = input.jobAvailability.trim()
  if (dr) o.DesiredRole = dr
  if (el) o.EducationLevel = el
  if (dc) o.DesiredCity = dc
  if (ja) o.Availability = ja
  const jms = input.jobMinSalary.trim()
  if (jms !== "") {
    const n = Number(jms)
    if (!Number.isNaN(n)) o.MinSalary = n
  }
  const sectors = input.sectors.map((s) => s.trim()).filter(Boolean)
  if (sectors.length > 0) o.Sectors = sectors
  if (input.jobDisability === "yes") o.Disability = true
  if (input.jobDisability === "no") o.Disability = false
  return Object.keys(o).length > 0 ? o : undefined
}

export const buildCandidateProfileSaveBody = (input: FullProfileFormInput): CandidateProfileSaveBody => {
  const body: CandidateProfileSaveBody = {
    headline: input.headline.trim(),
    summary: input.summary.trim(),
    resumeMarkdown: input.resumeMarkdown.trim(),
    nationalId: input.nationalId.trim(),
  }
  const fn = optStr(input.firstName)
  const ln = optStr(input.lastName)
  const c = optStr(input.country)
  const bc = optStr(input.birthCity)
  const ms = optStr(input.maritalStatus)
  const g = optStr(input.gender)
  const availabilityMerged =
    input.jobAvailability.trim() !== "" ? input.jobAvailability : input.availability
  const av = optStr(availabilityMerged)
  if (fn !== undefined) body.firstName = fn
  if (ln !== undefined) body.lastName = ln
  if (c !== undefined) body.country = c
  if (bc !== undefined) body.birthCity = bc
  if (ms !== undefined) body.maritalStatus = ms
  if (g !== undefined) body.gender = g
  if (av !== undefined) body.availability = av
  const iso = dateInputValueToIso(input.birthDateInput)
  if (iso) body.birthDate = iso
  const minSalaryMerged =
    input.jobMinSalary.trim() !== "" ? input.jobMinSalary : input.minSalary
  const msTrim = minSalaryMerged.trim()
  if (msTrim !== "") {
    const n = Number(msTrim)
    if (!Number.isNaN(n)) body.minSalary = n
  }
  const disabilityMerged: "" | "yes" | "no" =
    input.jobDisability === "yes" || input.jobDisability === "no"
      ? input.jobDisability
      : input.hasDisabilityChoice
  if (disabilityMerged === "yes") body.hasDisability = true
  if (disabilityMerged === "no") body.hasDisability = false

  const em = optStr(input.email)
  const ph = optStr(input.phoneNumber)
  if (em !== undefined) body.email = em
  if (ph !== undefined) body.phoneNumber = ph

  const vl = optStr(input.videoLink)
  if (vl !== undefined) body.videoLink = vl

  const jp = buildJobPreferencesPayload(input)
  if (jp) body.jobPreferences = jp

  const work = input.workRows
    .map(workRowToApi)
    .filter((row) => rowHasContent(row as unknown as Record<string, string>))
  if (work.length > 0) body.workExperience = work

  const edu = input.educationRows
    .map(eduRowToApi)
    .filter((row) => rowHasContent(row as unknown as Record<string, string>))
  if (edu.length > 0) body.education = edu

  const langs = input.languageRows
    .map(langRowToApi)
    .filter((row) => rowHasContent(row as unknown as Record<string, string>))
  if (langs.length > 0) body.languages = langs

  const skills = linesToSkillsArray(input.skillsText)
  if (skills.length > 0) body.skills = skills

  const socials = input.socialRows
    .map(socialRowToApi)
    .filter((row) => rowHasContent(row as unknown as Record<string, string>))
  if (socials.length > 0) body.socialLinks = socials

  const refs = input.referenceRows
    .map(refRowToApi)
    .filter((row) => rowHasContent(row as unknown as Record<string, string>))
  if (refs.length > 0) body.references = refs

  const recog = linesToRecognitionsArray(input.recognitionsText)
  if (recog.length > 0) body.recognitions = recog

  return body
}
