import { apiClient, type ApiClientError } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

const LINKS_PATH = "/api/recruiter/assessments/links"

export type AssessmentLinkUnavailableReason = "closed"

export interface AssessmentLinkVersionOption {
  id: string
  testId: string
  testTitle: string
  versionNumber: number
}

export interface AssessmentLinkVacancyOption {
  id: string
  title: string
  companyId: string
  companyName: string
  linkable: boolean
  unavailableReason: AssessmentLinkUnavailableReason | null
}

export interface AssessmentLinkRow {
  id: string
  testVersionId: string
  testId: string
  testTitle: string
  versionNumber: number
  vacancyId: string
  vacancyTitle: string
  companyId: string
  companyName: string
  active: boolean
  /** ISO timestamp; mapped from linkedAtUtc / CreatedAtUtc. */
  linkedAt: string
}

export interface AssessmentLinksCatalog {
  versions: AssessmentLinkVersionOption[]
  vacancies: AssessmentLinkVacancyOption[]
  links: AssessmentLinkRow[]
}

export interface CreateAssessmentLinkInput {
  vacancyId: string
  testVersionId: string
}

const LINK_ERROR_CODES = new Set([
  "duplicate_link",
  "vacancy_closed",
  "version_not_published",
  "test_not_published",
  "not_found",
])

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickString(
  raw: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = raw[key]
    if (value != null && String(value).trim() !== "") {
      return String(value).trim()
    }
  }
  return null
}

function pickNumber(
  raw: Record<string, unknown>,
  keys: string[],
  fallback = 0,
): number {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return fallback
}

function pickBoolean(
  raw: Record<string, unknown>,
  keys: string[],
): boolean | null {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === "boolean") return value
  }
  return null
}

function normalizeErrorCode(raw: string): string {
  const trimmed = raw.trim()
  if (LINK_ERROR_CODES.has(trimmed)) return trimmed
  const snake = trimmed
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase()
  return LINK_ERROR_CODES.has(snake) ? snake : trimmed
}

export function getAssessmentLinkApiErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null
  const body = "body" in error ? (error as ApiClientError).body : undefined
  const record = asRecord(body)
  if (!record) return null
  const code = pickString(record, ["code"])
  if (!code) return null
  return normalizeErrorCode(code)
}

export function resolveAssessmentLinkErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  const code = getAssessmentLinkApiErrorCode(error)
  if (code && LINK_ERROR_CODES.has(code)) {
    return t(`errors.${code}`)
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as ApiClientError).status === 404
  ) {
    return t("errors.not_found")
  }
  if (typeof error === "object" && error !== null && "body" in error) {
    const body = asRecord((error as ApiClientError).body)
    const bodyMessage = body ? pickString(body, ["message", "Message"]) : null
    if (bodyMessage) return bodyMessage
  }
  const apiMessage = getApiErrorMessage(error)
  if (apiMessage && apiMessage !== "Error desconocido") {
    return apiMessage
  }
  return t("errors.generic")
}

function normalizeUnavailableReason(
  raw: string | null,
): AssessmentLinkUnavailableReason | null {
  if (!raw) return null
  const normalized = raw.trim().toLowerCase()
  if (normalized === "closed") return "closed"
  return null
}

export function normalizeAssessmentLinkVersion(
  raw: unknown,
): AssessmentLinkVersionOption | null {
  const record = asRecord(raw)
  if (!record) return null
  const id = pickString(record, ["id", "Id"])
  const testId = pickString(record, ["testId", "TestId"])
  const testTitle = pickString(record, ["testTitle", "TestTitle"])
  if (!id || !testId || !testTitle) return null
  return {
    id,
    testId,
    testTitle,
    versionNumber: pickNumber(record, ["versionNumber", "VersionNumber"], 0),
  }
}

export function normalizeAssessmentLinkVacancy(
  raw: unknown,
): AssessmentLinkVacancyOption | null {
  const record = asRecord(raw)
  if (!record) return null
  const id = pickString(record, ["id", "Id"])
  const title = pickString(record, ["title", "Title"])
  const companyId = pickString(record, ["companyId", "CompanyId"])
  const companyName = pickString(record, ["companyName", "CompanyName"])
  if (!id || !title || !companyId || !companyName) return null
  const linkable = pickBoolean(record, ["linkable", "Linkable"]) ?? false
  const reasonRaw = pickString(record, [
    "unavailableReason",
    "UnavailableReason",
  ])
  return {
    id,
    title,
    companyId,
    companyName,
    linkable,
    unavailableReason: linkable ? null : normalizeUnavailableReason(reasonRaw),
  }
}

export function normalizeAssessmentLinkRow(
  raw: unknown,
): AssessmentLinkRow | null {
  const record = asRecord(raw)
  if (!record) return null
  const id = pickString(record, ["id", "Id"])
  const testVersionId = pickString(record, ["testVersionId", "TestVersionId"])
  const testId = pickString(record, ["testId", "TestId"])
  const testTitle = pickString(record, ["testTitle", "TestTitle"])
  const vacancyId = pickString(record, ["vacancyId", "VacancyId"])
  const vacancyTitle = pickString(record, ["vacancyTitle", "VacancyTitle"])
  const companyId = pickString(record, ["companyId", "CompanyId"])
  const companyName = pickString(record, ["companyName", "CompanyName"])
  const linkedAt =
    pickString(record, [
      "linkedAtUtc",
      "LinkedAtUtc",
      "createdAtUtc",
      "CreatedAtUtc",
      "linkedAt",
      "LinkedAt",
    ]) ?? ""
  if (
    !id ||
    !testVersionId ||
    !testId ||
    !testTitle ||
    !vacancyId ||
    !vacancyTitle ||
    !companyId ||
    !companyName ||
    !linkedAt
  ) {
    return null
  }
  return {
    id,
    testVersionId,
    testId,
    testTitle,
    versionNumber: pickNumber(record, ["versionNumber", "VersionNumber"], 0),
    vacancyId,
    vacancyTitle,
    companyId,
    companyName,
    active: pickBoolean(record, ["active", "Active", "isActive", "IsActive"]) ?? false,
    linkedAt,
  }
}

export function normalizeAssessmentLinksCatalog(
  raw: unknown,
): AssessmentLinksCatalog {
  const root = asRecord(raw) ?? {}
  const versionsRaw = Array.isArray(root.versions)
    ? root.versions
    : Array.isArray(root.Versions)
      ? root.Versions
      : []
  const vacanciesRaw = Array.isArray(root.vacancies)
    ? root.vacancies
    : Array.isArray(root.Vacancies)
      ? root.Vacancies
      : []
  const linksRaw = Array.isArray(root.links)
    ? root.links
    : Array.isArray(root.Links)
      ? root.Links
      : []

  const versions = versionsRaw
    .map(normalizeAssessmentLinkVersion)
    .filter((item): item is AssessmentLinkVersionOption => item != null)
  const vacancies = vacanciesRaw
    .map(normalizeAssessmentLinkVacancy)
    .filter((item): item is AssessmentLinkVacancyOption => item != null)
  const links = linksRaw
    .map(normalizeAssessmentLinkRow)
    .filter((item): item is AssessmentLinkRow => item != null)
    .sort((a, b) => b.linkedAt.localeCompare(a.linkedAt))

  return { versions, vacancies, links }
}

export async function getAssessmentLinksCatalog(): Promise<AssessmentLinksCatalog> {
  const raw = await apiClient.get(LINKS_PATH)
  return normalizeAssessmentLinksCatalog(raw)
}

export async function createAssessmentLink(
  input: CreateAssessmentLinkInput,
): Promise<AssessmentLinkRow> {
  const raw = await apiClient.post(LINKS_PATH, {
    vacancyId: input.vacancyId,
    testVersionId: input.testVersionId,
  })
  const link = normalizeAssessmentLinkRow(raw)
  if (!link) {
    throw new Error("Respuesta de vinculación inválida")
  }
  return link
}

export async function setAssessmentLinkActive(
  linkId: string,
  active: boolean,
): Promise<AssessmentLinkRow> {
  const raw = await apiClient.patch(
    `${LINKS_PATH}/${encodeURIComponent(linkId)}`,
    { active },
  )
  const link = normalizeAssessmentLinkRow(raw)
  if (!link) {
    throw new Error("Respuesta de vinculación inválida")
  }
  return link
}
