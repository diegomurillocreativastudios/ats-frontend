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
  /** True si el candidato ya envió consentimiento vigente (solo lectura; server-owned). */
  authAndConsentVerification?: boolean
  /** ISO-8601 UTC del consentimiento vigente, o null. */
  authAndConsentVerifiedAt?: string | null
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
    authAndConsentVerification: o.authAndConsentVerification === true,
    authAndConsentVerifiedAt: toNullableString(o.authAndConsentVerifiedAt),
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

/**
 * Partes de calendario (año-mes-día) sin corrimiento por zona horaria del navegador.
 * Los cumpleaños son fechas civiles; un ISO `…T00:00:00.000Z` no debe mostrarse como el día anterior en UTC-3/4.
 */
export function birthDateCalendarPartsFromUnknown(
  value: unknown
): { year: number; month: number; day: number } | null {
  if (value == null) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    }
  }
  if (typeof value !== "string") return null
  const s = value.trim()
  if (!s) return null

  const datePrefix = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (datePrefix) {
    const year = Number(datePrefix[1])
    const month = Number(datePrefix[2])
    const day = Number(datePrefix[3])
    const t = Date.UTC(year, month - 1, day)
    const check = new Date(t)
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() + 1 !== month ||
      check.getUTCDate() !== day
    ) {
      return null
    }
    return { year, month, day }
  }

  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  }
}

const birthDateInvalidFallbackDisplay = (value: unknown): string => {
  if (value == null) return "—"
  const t = String(value).trim()
  return t !== "" ? t : "—"
}

/** Formato legible de cumpleaños alineado al día civil guardado (locale por defecto Chile). */
export function formatBirthDateForDisplay(
  value: unknown,
  locale = "es-CL"
): string | null {
  if (value == null) return null
  if (typeof value === "string" && value.trim() === "") return null

  const parts = birthDateCalendarPartsFromUnknown(value)
  if (!parts) return birthDateInvalidFallbackDisplay(value)

  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  return utcDate.toLocaleDateString(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export const isoDateToDateInputValue = (iso: string | null | undefined): string => {
  if (!iso || typeof iso !== "string") return ""
  const parts = birthDateCalendarPartsFromUnknown(iso)
  if (!parts) return ""
  const y = parts.year
  const m = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export const dateInputValueToIso = (yyyyMmDd: string): string | null => {
  const t = yyyyMmDd.trim()
  if (!t) return null
  const d = new Date(`${t}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export const BIRTH_DATE_INPUT_INVALID_MESSAGE = "Fecha inválida"

const getLocalCalendarToday = (): { year: number; month: number; day: number } => {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

const compareCalendarParts = (
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number }
): number => {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

/**
 * Códigos de error de validación de fecha de nacimiento, agnósticos al idioma.
 *
 * Etapa 5E (i18n): permiten traducir el mensaje cerca del componente con `t()`
 * sin acoplar la lógica de validación a textos en español. El cálculo (calendario
 * válido, no futura, 18+ años cumplidos) NO cambia.
 */
export type BirthDateValidationErrorCode = "invalid" | "futureDate" | "tooYoung"

/**
 * Valida el valor `YYYY-MM-DD` del DatePicker para fecha de nacimiento y devuelve
 * un código de error (o `null` si es válido): calendario válido, no futura y al
 * menos 18 años cumplidos (día civil local).
 */
export function getBirthDateInputValidationErrorCode(
  yyyyMmDd: string
): BirthDateValidationErrorCode | null {
  const trimmed = yyyyMmDd.trim()
  if (!trimmed) return null

  const parts = birthDateCalendarPartsFromUnknown(trimmed)
  if (!parts) return "invalid"

  const today = getLocalCalendarToday()
  if (compareCalendarParts(parts, today) > 0) return "futureDate"

  const eighteenthBirthday = {
    year: today.year - 18,
    month: today.month,
    day: today.day,
  }
  if (compareCalendarParts(parts, eighteenthBirthday) > 0) return "tooYoung"

  return null
}

/**
 * Variante con mensaje fijo en español. Se conserva para consumers que aún no
 * tienen acceso a `t()` (p. ej. el hook compartido con RRHH). Reusa la lógica de
 * códigos para no duplicar reglas de negocio.
 */
export function getBirthDateInputValidationError(yyyyMmDd: string): string | null {
  return getBirthDateInputValidationErrorCode(yyyyMmDd)
    ? BIRTH_DATE_INPUT_INVALID_MESSAGE
    : null
}

const optStr = (s: string) => {
  const v = s.trim()
  return v === "" ? undefined : v
}

const rowHasContent = (o: Record<string, string>) =>
  Object.values(o).some((x) => String(x).trim() !== "")

export interface CandidateProfileRequiredFieldErrors {
  firstName?: boolean
  lastName?: boolean
  headline?: boolean
  summary?: boolean
  nationalId?: boolean
}

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

/**
 * ASP.NET exige ResumeMarkdown no vacío en PUT /api/candidate/profile.
 * Si no hay texto extraído del CV, se arma con los campos ya validados de la ficha.
 */
export const resolveResumeMarkdownForApi = (
  input: Pick<FullProfileFormInput, "resumeMarkdown" | "firstName" | "lastName" | "headline" | "summary">
): string => {
  const existing = input.resumeMarkdown.trim()
  if (existing) return existing
  const name = [input.firstName, input.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
  const headline = input.headline.trim()
  const summary = input.summary.trim()
  return [name ? `# ${name}` : "", headline, summary].filter(Boolean).join("\n\n")
}

export const buildCandidateProfileSaveBody = (input: FullProfileFormInput): CandidateProfileSaveBody => {
  const body: CandidateProfileSaveBody = {
    headline: input.headline.trim(),
    summary: input.summary.trim(),
    resumeMarkdown: resolveResumeMarkdownForApi(input),
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
