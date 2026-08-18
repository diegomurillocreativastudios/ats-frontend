import {
  getVacancyDepartmentId,
  getVacancyDepartmentSummary,
  getVacancyModalityId,
  getVacancyModalitySummary,
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
  vacancyDepartmentCode: string
  vacancyDepartmentName: string
  vacancyModalityId: string
  vacancyModalityCode: string
  vacancyModalityName: string
  companyId: string
  companyName: string
  requirements: VacancyClipboardRequirement[]
}

export interface VacancyClipboardRequirementRow {
  id: string
  requirementName: string
  requirementValue: string
  scale: number
}

export interface VacancyClipboardCatalogOption {
  id: string
  code?: string
  displayName?: string
}

export interface VacancyClipboardCompanyOption {
  id: string
  name: string
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

function readOptionalString(value: unknown): string {
  return typeof value === "string" ? value : ""
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

function normalizeMatchKey(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Parses and validates a stored clipboard JSON value.
 * Extra fields are dropped; corrupt or version-mismatched data yields null.
 * Catalog/company labels are optional so older sessionStorage copies still parse.
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
    vacancyDepartmentCode: readOptionalString(value.vacancyDepartmentCode),
    vacancyDepartmentName: readOptionalString(value.vacancyDepartmentName),
    vacancyModalityId: value.vacancyModalityId as string,
    vacancyModalityCode: readOptionalString(value.vacancyModalityCode),
    vacancyModalityName: readOptionalString(value.vacancyModalityName),
    companyId: value.companyId as string,
    companyName: readOptionalString(value.companyName),
    requirements: value.requirements.map((requirement) => ({
      requirementName: requirement.requirementName,
      requirementValue: requirement.requirementValue,
      scale: requirement.scale,
    })),
  }
}

/**
 * Parses a JSON string from sessionStorage or the system clipboard.
 */
export function parseVacancyClipboardFromText(
  raw: string | null | undefined
): VacancyClipboardPayload | null {
  if (raw == null || raw.trim() === "") return null
  try {
    return parseVacancyClipboardPayload(JSON.parse(raw.trim()))
  } catch {
    return null
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
 * Catalog and company labels travel with the payload so another environment can match by name.
 */
export function buildVacancyClipboardPayload(
  vacancy: unknown,
  companyId: string,
  companyName = ""
): VacancyClipboardPayload {
  const record = isNonNullObject(vacancy) ? vacancy : {}
  const countryRaw = record.countryCode ?? record.country_code
  const countryCode = readTrimmedString(countryRaw).toUpperCase()
  const departmentSummary = getVacancyDepartmentSummary(record)
  const modalitySummary = getVacancyModalitySummary(record)
  const resolvedCompanyName =
    readTrimmedString(companyName) ||
    readTrimmedString(record.company) ||
    readTrimmedString(record.companyName)

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
    vacancyDepartmentCode: readTrimmedString(departmentSummary?.code),
    vacancyDepartmentName: readTrimmedString(departmentSummary?.displayName),
    vacancyModalityId: getVacancyModalityId(record),
    vacancyModalityCode: readTrimmedString(modalitySummary?.code),
    vacancyModalityName: readTrimmedString(modalitySummary?.displayName),
    companyId: readTrimmedString(companyId),
    companyName: resolvedCompanyName,
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

/**
 * Resolves a copied catalog id against the destination environment.
 * Prefers an exact id match, then code, then display name.
 */
export function resolveClipboardCatalogId(
  payloadId: string,
  payloadCode: string,
  payloadName: string,
  options: VacancyClipboardCatalogOption[]
): string {
  const copiedId = payloadId.trim()
  if (copiedId !== "" && options.some((option) => option.id === copiedId)) {
    return copiedId
  }

  const copiedCode = normalizeMatchKey(payloadCode)
  if (copiedCode !== "") {
    const byCode = options.find(
      (option) => normalizeMatchKey(option.code ?? "") === copiedCode
    )
    if (byCode) return byCode.id
  }

  const copiedName = normalizeMatchKey(payloadName)
  if (copiedName !== "") {
    const byName = options.find(
      (option) => normalizeMatchKey(option.displayName ?? "") === copiedName
    )
    if (byName) return byName.id
  }

  return ""
}

/**
 * Resolves a copied company against the destination list.
 * Returns null when nothing matches so the current selection is kept.
 */
export function resolveClipboardCompanyId(
  payloadId: string,
  payloadName: string,
  companies: VacancyClipboardCompanyOption[]
): string | null {
  const copiedId = payloadId.trim()
  if (copiedId !== "" && companies.some((company) => company.id === copiedId)) {
    return copiedId
  }

  const copiedName = normalizeMatchKey(payloadName)
  if (copiedName === "") return null

  const byName = companies.find(
    (company) => normalizeMatchKey(company.name) === copiedName
  )
  return byName?.id ?? null
}

function persistPayloadToSession(payload: VacancyClipboardPayload): boolean {
  if (!canUseSessionStorage()) return false
  try {
    window.sessionStorage.setItem(
      VACANCY_CLIPBOARD_STORAGE_KEY,
      JSON.stringify(payload)
    )
    return true
  } catch {
    return false
  }
}

/** Writes a validated vacancy clipboard payload to sessionStorage and the system clipboard. */
export async function writeVacancyClipboard(
  payload: VacancyClipboardPayload
): Promise<boolean> {
  const parsed = parseVacancyClipboardPayload(payload)
  if (!parsed) return false

  const serialized = JSON.stringify(parsed)
  let stored = persistPayloadToSession(parsed)

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(serialized)
      stored = true
    }
  } catch {
    // Permission or insecure context: sessionStorage may still have the copy.
  }

  return stored
}

/** Reads the vacancy clipboard from sessionStorage only. */
export function readVacancyClipboardFromSession(): VacancyClipboardPayload | null {
  if (!canUseSessionStorage()) return null
  try {
    return parseVacancyClipboardFromText(
      window.sessionStorage.getItem(VACANCY_CLIPBOARD_STORAGE_KEY)
    )
  } catch {
    return null
  }
}

/**
 * Reads the vacancy clipboard. Prefers sessionStorage, then the system clipboard.
 * A valid system-clipboard payload is persisted to sessionStorage for later pastes in this tab.
 */
export async function readVacancyClipboard(): Promise<VacancyClipboardPayload | null> {
  const fromSession = readVacancyClipboardFromSession()
  if (fromSession) return fromSession

  try {
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
      return null
    }
    const parsed = parseVacancyClipboardFromText(await navigator.clipboard.readText())
    if (!parsed) return null
    persistPayloadToSession(parsed)
    return parsed
  } catch {
    return null
  }
}

/** Returns whether a valid vacancy clipboard payload is in sessionStorage. */
export function hasVacancyClipboard(): boolean {
  return readVacancyClipboardFromSession() !== null
}
