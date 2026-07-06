import {
  buildCandidateProfileSaveBody,
  normalizeCandidateProfileFromApi,
  type CandidateProfile,
  type CandidateProfileSaveBody,
  type FullProfileFormInput,
} from "@/lib/candidate-profile"
import { buildFullFormStateFromSources } from "@/lib/candidate-profile-hydrate"
import {
  normalizeAtsComplianceChecklist,
  type AtsComplianceChecklistItem,
} from "@/lib/ats-compliance-checklist"

export type {
  AtsComplianceChecklistItem,
  AtsComplianceStatus,
  AtsGapType,
} from "@/lib/ats-compliance-checklist"

export type ProfileVacancySource = "platform" | "text" | "file"

export interface ProfileChangeHighlight {
  field: string
  before: string
  after: string
  reason?: string
}

export interface ProfileVersionSummary {
  id: string
  label: string | null
  vacancyTitle: string | null
  vacancySource: ProfileVacancySource | null
  versionNumber: number
  createdAt: string
  estimatedMatchScore: number | null
}

export interface ProfileVersionDetail extends ProfileVersionSummary {
  promptVersion: string | null
  vacancyId: string | null
  adaptationSummary: string | null
  changeHighlights: ProfileChangeHighlight[]
  atsComplianceChecklist: AtsComplianceChecklistItem[]
  profileSnapshot: CandidateProfile
}

export interface TailorToVacancyResult {
  versionId: string
  versionNumber: number
  promptVersion: string | null
  vacancySource: ProfileVacancySource | null
  vacancyTitle: string | null
  estimatedMatchScore: number | null
  currentProfile: CandidateProfile
  adaptedProfile: CandidateProfile
  adaptationSummary: string | null
  changeHighlights: ProfileChangeHighlight[]
  atsComplianceChecklist: AtsComplianceChecklistItem[]
}

const toTrimmedString = (value: unknown): string => {
  if (value == null) return ""
  return String(value).trim()
}

const toNullableString = (value: unknown): string | null => {
  const s = toTrimmedString(value)
  return s === "" ? null : s
}

const toNullableNumber = (value: unknown): number | null => {
  if (value == null) return null
  if (typeof value === "number" && !Number.isNaN(value)) return value
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

const parseVacancySource = (value: unknown): ProfileVacancySource | null => {
  const s = toTrimmedString(value).toLowerCase()
  if (s === "platform" || s === "text" || s === "file") return s
  return null
}

const normalizeChangeHighlights = (raw: unknown): ProfileChangeHighlight[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (item == null || typeof item !== "object") return null
      const o = item as Record<string, unknown>
      const field = toTrimmedString(o.field)
      if (!field) return null
      return {
        field,
        before: toTrimmedString(o.before),
        after: toTrimmedString(o.after),
        ...(toNullableString(o.reason) ? { reason: toNullableString(o.reason)! } : {}),
      } satisfies ProfileChangeHighlight
    })
    .filter((item): item is ProfileChangeHighlight => item != null)
}

const normalizeVersionSummary = (raw: unknown): ProfileVersionSummary | null => {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const id = toTrimmedString(o.id)
  if (!id) return null
  return {
    id,
    label: toNullableString(o.label),
    vacancyTitle: toNullableString(o.vacancyTitle),
    vacancySource: parseVacancySource(o.vacancySource),
    versionNumber: toNullableNumber(o.versionNumber) ?? 0,
    createdAt: toTrimmedString(o.createdAt),
    estimatedMatchScore: toNullableNumber(o.estimatedMatchScore),
  }
}

export function normalizeProfileVersionSummaryList(raw: unknown): ProfileVersionSummary[] {
  if (Array.isArray(raw)) {
    return raw
      .map(normalizeVersionSummary)
      .filter((item): item is ProfileVersionSummary => item != null)
  }
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    const items = o.items ?? o.versions ?? o.data
    if (Array.isArray(items)) {
      return items
        .map(normalizeVersionSummary)
        .filter((item): item is ProfileVersionSummary => item != null)
    }
  }
  return []
}

export function normalizeProfileVersionDetail(raw: unknown): ProfileVersionDetail | null {
  const summary = normalizeVersionSummary(raw)
  if (!summary) return null
  const o = raw as Record<string, unknown>
  const snapshotRaw = o.profileSnapshot ?? o.adaptedProfile ?? o.snapshot
  return {
    ...summary,
    promptVersion: toNullableString(o.promptVersion),
    vacancyId: toNullableString(o.vacancyId),
    adaptationSummary: toNullableString(o.adaptationSummary),
    changeHighlights: normalizeChangeHighlights(o.changeHighlights),
    atsComplianceChecklist: normalizeAtsComplianceChecklist(o.atsComplianceChecklist),
    profileSnapshot: normalizeCandidateProfileFromApi(snapshotRaw),
  }
}

export function normalizeTailorToVacancyResult(raw: unknown): TailorToVacancyResult | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const versionId = toTrimmedString(o.versionId)
  if (!versionId) return null
  return {
    versionId,
    versionNumber: toNullableNumber(o.versionNumber) ?? 0,
    promptVersion: toNullableString(o.promptVersion),
    vacancySource: parseVacancySource(o.vacancySource),
    vacancyTitle: toNullableString(o.vacancyTitle),
    estimatedMatchScore: toNullableNumber(o.estimatedMatchScore),
    currentProfile: normalizeCandidateProfileFromApi(o.currentProfile),
    adaptedProfile: normalizeCandidateProfileFromApi(o.adaptedProfile),
    adaptationSummary: toNullableString(o.adaptationSummary),
    changeHighlights: normalizeChangeHighlights(o.changeHighlights),
    atsComplianceChecklist: normalizeAtsComplianceChecklist(o.atsComplianceChecklist),
  }
}

/**
 * Mapea el perfil adaptado de la API al estado de formulario del editor compartido.
 */
export function adaptedProfileToFormState(
  adaptedProfile: CandidateProfile
): FullProfileFormInput {
  return buildFullFormStateFromSources(adaptedProfile, {})
}

/** Convierte el estado del editor a perfil normalizado para la vista comparativa. */
export function formStateToDisplayProfile(form: FullProfileFormInput): CandidateProfile {
  return normalizeCandidateProfileFromApi(buildCandidateProfileSaveBody(form))
}

export interface ProfileVersionPatchBody {
  label?: string | null
  profileSnapshot?: CandidateProfileSaveBody
}

export function getVersionDisplayTitle(
  version: Pick<ProfileVersionSummary, "label" | "vacancyTitle" | "versionNumber">,
  fallbackLabel: string
): string {
  return version.label?.trim() || version.vacancyTitle?.trim() || fallbackLabel
}
