import { apiClient } from "@/lib/api"

/** Default tenant when the API omits `companyId` on create. */
export const DEFAULT_RECRUITER_COMPANY_ID =
  "00000000-0000-0000-0000-000000000001"

const VACANCY_COMPANY_STORAGE_PREFIX = "ats:vacancy-company:"

export interface RecruiterCompanyOption {
  id: string
  name: string
  isActive: boolean
}

export interface RecruiterVacancyStatusOption {
  id: string
  name: string
}

export interface RecruiterStageOption {
  id: string
  name: string
  order: number
  orderIndex: number
  final?: boolean
  isHiredStage?: boolean
}

export interface RecruiterApplicantStatusOption {
  id: string
  name: string
  final?: boolean
}

function parseListPayload(raw: unknown, keys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw
  const root = raw as Record<string, unknown> | null | undefined
  if (!root) return []
  for (const key of keys) {
    const nested = root[key]
    if (Array.isArray(nested)) return nested
  }
  return []
}

export function vacancyCompanyIdStorageKey(vacancyId: string): string {
  return `${VACANCY_COMPANY_STORAGE_PREFIX}${vacancyId}`
}

/** Persists tenant id after POST create when detail/list only expose company name. */
export function persistVacancyCompanyId(vacancyId: string, companyId: string): void {
  if (typeof window === "undefined") return
  const id = String(vacancyId ?? "").trim()
  const company = String(companyId ?? "").trim()
  if (!id || !company) return
  try {
    sessionStorage.setItem(vacancyCompanyIdStorageKey(id), company)
  } catch {
    // quota / private mode
  }
}

export function readPersistedVacancyCompanyId(vacancyId: string): string | null {
  if (typeof window === "undefined") return null
  const id = String(vacancyId ?? "").trim()
  if (!id) return null
  try {
    const stored = sessionStorage.getItem(vacancyCompanyIdStorageKey(id))
    const trimmed = stored?.trim() ?? ""
    return trimmed !== "" ? trimmed : null
  } catch {
    return null
  }
}

/**
 * Resolves the tenant `companyId` for vacancy create/edit (not pipeline catalogs).
 * Detail/list DTOs may only include `company` (display name).
 */
export function resolveVacancyCompanyId(
  vacancy: Record<string, unknown> | null | undefined,
  companies: RecruiterCompanyOption[] = [],
  vacancyId?: string | null
): string {
  const direct = vacancy?.companyId ?? vacancy?.company_id
  if (direct != null && String(direct).trim() !== "") {
    return String(direct).trim()
  }

  const persisted =
    vacancyId != null ? readPersistedVacancyCompanyId(String(vacancyId)) : null
  if (persisted) return persisted

  const companyName = String(vacancy?.company ?? vacancy?.companyName ?? "").trim()
  if (companyName !== "" && companies.length > 0) {
    const lower = companyName.toLowerCase()
    const match = companies.find((c) => {
      const candidate = String(c.name ?? "").trim()
      return candidate.toLowerCase() === lower || c.id === companyName
    })
    if (match?.id) return match.id
  }

  return DEFAULT_RECRUITER_COMPANY_ID
}

export const ADMIN_STAGES_CATALOG_PATH = "/portal-admin/vacantes/etapas"

/**
 * Admin stages catalog (global platform pipeline).
 * `companyId` is ignored when passed for call-site compatibility.
 */
export function adminStagesCatalogHref(_companyId?: string | null): string {
  return ADMIN_STAGES_CATALOG_PATH
}

export async function listRecruiterCompanies(): Promise<RecruiterCompanyOption[]> {
  const raw = await apiClient.get("/api/recruiter/companies")
  const list = parseListPayload(raw, ["companies", "items", "data"])
  return (list as Record<string, unknown>[]).map((item, i) => ({
    id: String(item?.id ?? item?.uuid ?? item?.companyId ?? i),
    name: String(item?.name ?? item?.companyName ?? "—"),
    isActive: Boolean(item?.isActive ?? item?.is_active ?? true),
  }))
}

export async function listCompanyVacancyStatuses(
  companyId: string
): Promise<RecruiterVacancyStatusOption[]> {
  if (!companyId.trim()) return []
  const raw = await apiClient.get(
    `/api/recruiter/companies/${encodeURIComponent(companyId)}/vacancy-statuses`
  )
  const list = parseListPayload(raw, [
    "vacancyStatuses",
    "statuses",
    "items",
    "data",
  ])
  return (list as Record<string, unknown>[]).map((item, i) => ({
    id: String(item?.id ?? item?.uuid ?? i),
    name: String(item?.name ?? item?.statusName ?? item?.status_name ?? "—"),
  }))
}

/** Global application-stage catalog (no company scope). */
export async function listRecruiterStages(): Promise<RecruiterStageOption[]> {
  const raw = await apiClient.get("/api/recruiter/stages")
  const list = parseListPayload(raw, ["stages", "items", "data"])
  return (list as Record<string, unknown>[])
    .map((item, i) => {
      const orderIndex =
        typeof item?.orderIndex === "number"
          ? item.orderIndex
          : typeof item?.order === "number"
            ? item.order
            : i
      return {
        id: String(item?.id ?? item?.uuid ?? i),
        name: String(item?.name ?? item?.stageName ?? "—"),
        order: orderIndex,
        orderIndex,
        final: Boolean(item?.final ?? false),
        isHiredStage: Boolean(item?.isHiredStage ?? item?.is_hired_stage ?? false),
      }
    })
    .sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
      return String(a.id).localeCompare(String(b.id))
    })
}

/** Global application-status catalog (no company scope). */
export async function listCompanyApplicantStatuses(): Promise<
  RecruiterApplicantStatusOption[]
> {
  const raw = await apiClient.get("/api/recruiter/statuses")
  const list = parseListPayload(raw, ["statuses", "items", "data"])
  return (list as Record<string, unknown>[]).map((item, i) => ({
    id: String(item?.id ?? item?.uuid ?? i),
    name: String(item?.name ?? item?.status_name ?? "—"),
    final: Boolean(item?.final ?? item?.isFinal ?? item?.is_final ?? false),
  }))
}
