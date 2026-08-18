import {
  getVacancyDepartmentId,
  getVacancyModalityId,
} from "@/lib/vacancy-catalogs"
import { toRequirementImportance } from "@/lib/vacancies/format-requirement-key"
import { readVacancyStateCode } from "@/lib/vacancies/vacancy-location"

export const VACANCY_CLIPBOARD_STORAGE_KEY = "ats:vacancy-clipboard"
export const VACANCY_CLIPBOARD_VERSION = 1 as const

const REQUIREMENT_SCALE_MIN = 1
const REQUIREMENT_SCALE_MAX = 10
const DEFAULT_REQUIREMENT_SCALE = 5

export interface VacancyClipboardRequirement {
  requirementName: string
  requirementValue: string
  scale: number
}

export interface VacancyClipboardPayload {
  version: typeof VACANCY_CLIPBOARD_VERSION
  title: string
  description: string
  details: string
  salary: string
  advantages: string
  countryCode: string
  stateCode: string
  vacancyDepartmentId: string
  vacancyModalityId: string
  companyId: string
  requirements: VacancyClipboardRequirement[]
}

export interface VacancyClipboardRequirementRow {
  id: string
  requirementName: string
  requirementValue: string
  scale: number
}

const PAYLOAD_STRING_KEYS = [
  "title",
  "description",
  "details",
  "salary",
  "advantages",
  "countryCode",
  "stateCode",
  "vacancyDepartmentId",
  "vacancyModalityId",
  "companyId",
] as const

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
}

function isNonNullObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
}

function readTrimmedString(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

function boundRequirementScale(scale: number): number {
  const rounded = Math.round(scale)
  return Math.min(REQUIREMENT_SCALE_MAX, Math.max(REQUIREMENT_SCALE_MIN, rounded))
}

function newRequirementId(): string {
  return crypto.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isValidRequirement(value: unknown): value is VacancyClipboardRequirement {
  if (!isNonNullObject(value)) return false
  if (typeof value.requirementName !== "string") return false
  if (typeof value.requirementValue !== "string") return false
  if (typeof value.scale !== "number" || !Number.isFinite(value.scale)) return false
  return true
}

/**
 * Parses and validates a stored clipboard JSON value.
 * Extra fields are dropped; corrupt or version-mismatched data yields null.
 */
export function parseVacancyClipboardPayload(
  value: unknown
): VacancyClipboardPayload | null {
  if (!isNonNullObject(value)) return null
  if (value.version !== VACANCY_CLIPBOARD_VERSION) return null
  if (!Array.isArray(value.requirements)) return null
  if (!value.requirements.every(isValidRequirement)) return null

  for (const key of PAYLOAD_STRING_KEYS) {
    if (typeof value[key] !== "string") return null
  }

  return {
    version: VACANCY_CLIPBOARD_VERSION,
    title: value.title as string,
    description: value.description as string,
    details: value.details as string,
    salary: value.salary as string,
    advantages: value.advantages as string,
    countryCode: value.countryCode as string,
    stateCode: value.stateCode as string,
    vacancyDepartmentId: value.vacancyDepartmentId as string,
    vacancyModalityId: value.vacancyModalityId as string,
    companyId: value.companyId as string,
    requirements: value.requirements.map((requirement) => ({
      requirementName: requirement.requirementName,
      requirementValue: requirement.requirementValue,
      scale: requirement.scale,
    })),
  }
}

function extractRequirements(
  vacancy: Record<string, unknown>
): VacancyClipboardRequirement[] {
  const rawReqs = vacancy.requirements
  const reqObj = isNonNullObject(rawReqs) ? rawReqs : null
  if (!reqObj) return []

  const weights = isNonNullObject(vacancy.weights) ? vacancy.weights : null
  const attributes = isNonNullObject(weights?.attributes) ? weights.attributes : {}

  return Object.entries(reqObj)
    .filter(([key]) => key != null && !String(key).startsWith("additionalProp"))
    .map(([key, value]) => {
      const importance = toRequirementImportance(attributes[key])
      const scale =
        importance == null || importance < REQUIREMENT_SCALE_MIN
          ? DEFAULT_REQUIREMENT_SCALE
          : boundRequirementScale(importance)
      return {
        requirementName: String(key ?? ""),
        requirementValue: typeof value === "string" ? value : readTrimmedString(value),
        scale,
      }
    })
}

/**
 * Builds a versioned clipboard payload from a vacancy record.
 * Only form content is copied; ids, status, dates and applicants are omitted.
 */
export function buildVacancyClipboardPayload(
  vacancy: unknown,
  companyId: string
): VacancyClipboardPayload {
  const record = isNonNullObject(vacancy) ? vacancy : {}
  const countryRaw = record.countryCode ?? record.country_code
  const countryCode = readTrimmedString(countryRaw).toUpperCase()

  return {
    version: VACANCY_CLIPBOARD_VERSION,
    title: readTrimmedString(record.title),
    description: readTrimmedString(record.description),
    details: record.details == null ? "" : String(record.details),
    salary: record.salary == null ? "" : String(record.salary),
    advantages: record.advantages == null ? "" : String(record.advantages),
    countryCode,
    stateCode: readVacancyStateCode(record) ?? "",
    vacancyDepartmentId: getVacancyDepartmentId(record),
    vacancyModalityId: getVacancyModalityId(record),
    companyId: readTrimmedString(companyId),
    requirements: extractRequirements(record),
  }
}

/**
 * Maps clipboard requirements to form rows with fresh React keys.
 * An empty list becomes a single blank row so the form stays usable.
 */
export function clipboardPayloadToRequirementRows(
  requirements: VacancyClipboardRequirement[]
): VacancyClipboardRequirementRow[] {
  const filled = requirements.filter(
    (requirement) =>
      requirement.requirementName.trim() !== "" ||
      requirement.requirementValue.trim() !== ""
  )

  if (filled.length === 0) {
    return [
      {
        id: newRequirementId(),
        requirementName: "",
        requirementValue: "",
        scale: DEFAULT_REQUIREMENT_SCALE,
      },
    ]
  }

  return filled.map((requirement) => ({
    id: newRequirementId(),
    requirementName: requirement.requirementName,
    requirementValue: requirement.requirementValue,
    scale: boundRequirementScale(requirement.scale),
  }))
}

/** Writes a validated vacancy clipboard payload to sessionStorage. */
export function writeVacancyClipboard(payload: VacancyClipboardPayload): boolean {
  if (!canUseSessionStorage()) return false
  const parsed = parseVacancyClipboardPayload(payload)
  if (!parsed) return false
  try {
    window.sessionStorage.setItem(
      VACANCY_CLIPBOARD_STORAGE_KEY,
      JSON.stringify(parsed)
    )
    return true
  } catch {
    return false
  }
}

/** Reads the vacancy clipboard. Returns null when missing, corrupt, or unsupported. */
export function readVacancyClipboard(): VacancyClipboardPayload | null {
  if (!canUseSessionStorage()) return null
  try {
    const raw = window.sessionStorage.getItem(VACANCY_CLIPBOARD_STORAGE_KEY)
    if (raw == null || raw.trim() === "") return null
    return parseVacancyClipboardPayload(JSON.parse(raw))
  } catch {
    return null
  }
}

/** Returns whether a valid vacancy clipboard payload is stored. */
export function hasVacancyClipboard(): boolean {
  return readVacancyClipboard() !== null
}
