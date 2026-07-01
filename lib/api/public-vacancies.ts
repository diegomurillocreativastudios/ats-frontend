import { apiClient } from "@/lib/api"
import { formatCountryCodeLabel } from "@/lib/profile-form-options"
import { normalizeCountryCode, readVacancyStateCode } from "@/lib/vacancies/vacancy-location"
import {
  getVacancyDepartmentSummary,
  getVacancyModalitySummary,
  type VacancyCatalogSummary,
} from "@/lib/vacancy-catalogs"

export interface OpportunityFilterOption {
  id: string
  code: string
  displayName: string
  count?: number
}

export interface OpportunityListFilters {
  departmentId?: string
  departmentCode?: string
  modalityId?: string
  modalityCode?: string
  vacanteName?: string
  search?: string
  countryCode?: string
  country?: string
  page?: number
}

export interface OpportunityCompanyLogo {
  logoFileId?: string
  contentType: string
  fileName?: string
  sizeBytes?: number
  base64: string
}

export interface OpportunityCompanySummary {
  id: string
  name: string
  hasLogo: boolean
  logo: OpportunityCompanyLogo | null
}

export interface OpportunityVacancySummary {
  id: string
  title: string
  company: OpportunityCompanySummary
  countryCode?: string
  stateCode?: string | null
  countryLabel?: string
  department?: VacancyCatalogSummary
  modality?: VacancyCatalogSummary
  locationLabel?: string
  summary?: string
  publishedAt?: string
}

export interface OpportunityVacancyDetail extends OpportunityVacancySummary {
  description?: string
  details?: string
  advantages?: string
  responsibilities?: string[]
  requirements?: string[]
  benefits?: string[]
}

export interface OpportunityPagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface OpportunityAvailableFilters {
  departments: OpportunityFilterOption[]
  modalities: OpportunityFilterOption[]
}

export interface OpportunityListResponse {
  items: OpportunityVacancySummary[]
  availableFilters: OpportunityAvailableFilters
  pagination: OpportunityPagination
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function toOptionalString(value: unknown): string | undefined {
  if (value == null) return undefined
  const normalized = String(value).trim()
  return normalized === "" ? undefined : normalized
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim()
        if (typeof item === "number") return String(item)
        return ""
      })
      .filter(Boolean)
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  return []
}

function normalizeFilterOption(raw: unknown): OpportunityFilterOption | null {
  const record = getRecord(raw)
  if (!record) return null

  const displayName = toOptionalString(
    record.displayName ?? record.display_name ?? record.name ?? record.label
  )

  if (!displayName) return null

  const id = toOptionalString(record.id ?? record.uuid) ?? displayName
  const code = toOptionalString(record.code) ?? displayName
  const countValue = toOptionalString(
    record.count ?? record.total ?? record.vacanciesCount ?? record.vacancies_count
  )

  return {
    id,
    code,
    displayName,
    count: countValue != null ? toNumber(countValue, 0) : undefined,
  }
}

function normalizeFilterList(value: unknown): OpportunityFilterOption[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => normalizeFilterOption(item))
    .filter((item): item is OpportunityFilterOption => item != null)
}

function normalizeCompanyLogo(raw: unknown): OpportunityCompanyLogo | null {
  const record = getRecord(raw)
  if (!record) return null

  const base64 = toOptionalString(record.base64 ?? record.Base64)
  if (!base64) return null

  const contentType =
    toOptionalString(record.contentType ?? record.content_type ?? record.ContentType) ??
    "image/png"
  const sizeBytesValue = record.sizeBytes ?? record.size_bytes ?? record.SizeBytes
  const sizeBytes =
    sizeBytesValue != null && Number.isFinite(Number(sizeBytesValue))
      ? Number(sizeBytesValue)
      : undefined

  return {
    logoFileId: toOptionalString(record.logoFileId ?? record.logo_file_id ?? record.LogoFileId),
    contentType,
    fileName: toOptionalString(record.fileName ?? record.file_name ?? record.FileName),
    sizeBytes,
    base64,
  }
}

function normalizeCompany(raw: Record<string, unknown>): OpportunityCompanySummary {
  const nestedCompany = getRecord(raw.company)
  const companyName =
    toOptionalString(
      nestedCompany?.displayName ??
        nestedCompany?.name ??
        raw.companyName ??
        raw.company_name ??
        raw.company
    ) ?? "Empresa no especificada"

  const logo = normalizeCompanyLogo(
    nestedCompany?.logo ?? nestedCompany?.Logo ?? raw.logo ?? raw.Logo
  )
  const hasLogoRaw =
    nestedCompany?.hasLogo ??
    nestedCompany?.has_logo ??
    nestedCompany?.HasLogo ??
    raw.hasLogo ??
    raw.has_logo ??
    raw.HasLogo

  return {
    id:
      toOptionalString(nestedCompany?.id ?? nestedCompany?.uuid ?? raw.companyId) ??
      companyName,
    name: companyName,
    hasLogo: hasLogoRaw != null ? Boolean(hasLogoRaw) : logo != null,
    logo,
  }
}

export function buildOpportunityCompanyLogoDataUri(
  logo: OpportunityCompanyLogo | null
): string | null {
  if (!logo || !logo.base64) return null
  const contentType = logo.contentType || "image/png"
  return `data:${contentType};base64,${logo.base64}`
}

function normalizeCountryCodeField(raw: Record<string, unknown>): string | undefined {
  return normalizeCountryCode(raw.countryCode ?? raw.country_code) ?? undefined
}

function normalizeStateCodeField(raw: Record<string, unknown>): string | null {
  return readVacancyStateCode(raw)
}

function normalizeLocationLabel(
  raw: Record<string, unknown>,
  countryCode?: string
): string | undefined {
  const direct =
    toOptionalString(raw.locationLabel ?? raw.location_label ?? raw.location) ??
    toOptionalString(raw.country ?? raw.country_name)

  if (direct) return direct
  if (countryCode) return formatCountryCodeLabel(countryCode)
  return undefined
}

function normalizeOpportunitySummary(raw: unknown): OpportunityVacancySummary | null {
  const record = getRecord(raw)
  if (!record) return null

  const id = toOptionalString(record.id ?? record.uuid)
  const title = toOptionalString(record.title ?? record.name ?? record.position)

  if (!id || !title) return null

  const countryCode = normalizeCountryCodeField(record)
  const stateCode = normalizeStateCodeField(record)

  return {
    id,
    title,
    company: normalizeCompany(record),
    countryCode,
    stateCode,
    countryLabel: countryCode ? formatCountryCodeLabel(countryCode) : undefined,
    department: getVacancyDepartmentSummary(record) ?? undefined,
    modality: getVacancyModalitySummary(record) ?? undefined,
    locationLabel: normalizeLocationLabel(record, countryCode),
    summary: toOptionalString(record.summary ?? record.shortDescription ?? record.description),
    publishedAt: toOptionalString(
      record.publishedAt ?? record.published_at ?? record.createdAt ?? record.created_at
    ),
  }
}

export function normalizeOpportunityListResponse(payload: unknown): OpportunityListResponse {
  const record = getRecord(payload)

  const itemsSource =
    record?.items ?? record?.data ?? record?.results ?? record?.vacancies ?? payload

  const items = Array.isArray(itemsSource)
    ? itemsSource
        .map((item) => normalizeOpportunitySummary(item))
        .filter((item): item is OpportunityVacancySummary => item != null)
    : []

  const availableFiltersRecord = getRecord(record?.availableFilters ?? record?.available_filters)
  const departments = normalizeFilterList(
    availableFiltersRecord?.departments ?? availableFiltersRecord?.departmentOptions
  )
  const modalities = normalizeFilterList(
    availableFiltersRecord?.modalities ?? availableFiltersRecord?.modalityOptions
  )

  const page = Math.max(
    1,
    toNumber(record?.page ?? record?.pageNumber ?? record?.currentPage, 1)
  )
  const pageSize = Math.max(
    items.length || 1,
    toNumber(record?.pageSize ?? record?.page_size ?? record?.limit, items.length || 1)
  )
  const totalCount = Math.max(
    items.length,
    toNumber(record?.totalCount ?? record?.total_count ?? record?.total, items.length)
  )
  const totalPages = Math.max(
    1,
    toNumber(
      record?.totalPages ?? record?.total_pages,
      pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1
    )
  )

  return {
    items,
    availableFilters: {
      departments,
      modalities,
    },
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage:
        Boolean(record?.hasNextPage ?? record?.has_next_page) || page < totalPages,
      hasPreviousPage:
        Boolean(record?.hasPreviousPage ?? record?.has_previous_page) || page > 1,
    },
  }
}

export function normalizeOpportunityDetail(payload: unknown): OpportunityVacancyDetail | null {
  const summary = normalizeOpportunitySummary(payload)
  const record = getRecord(payload)

  if (!summary || !record) return summary

  return {
    ...summary,
    description: toOptionalString(
      record.description ?? record.jobDescription ?? record.job_description ?? record.summary
    ),
    details: toOptionalString(record.details ?? record.additionalDetails ?? record.additional_details),
    advantages: toOptionalString(record.advantages ?? record.perks ?? record.benefitsText),
    responsibilities: toStringArray(
      record.responsibilities ?? record.duties ?? record.tasks
    ),
    requirements: toStringArray(record.requirements ?? record.skills),
    benefits: toStringArray(record.benefits),
  }
}

export function buildPublicVacanciesQuery(filters: OpportunityListFilters): string {
  const params = new URLSearchParams()
  const normalizedVacanteName = filters.vacanteName ?? filters.search
  const normalizedFilters: OpportunityListFilters = {
    ...filters,
    search: normalizedVacanteName,
    vacanteName: normalizedVacanteName,
  }

  const entries = Object.entries(normalizedFilters).filter(([, value]) => {
    if (typeof value === "number") return Number.isFinite(value) && value > 0
    return value != null && String(value).trim() !== ""
  })

  for (const [key, value] of entries) {
    params.set(key, String(value))
  }

  const query = params.toString()
  return query ? `?${query}` : ""
}

export async function listPublicVacancies(
  filters: OpportunityListFilters
): Promise<OpportunityListResponse> {
  const data = await apiClient.get(`/api/vacantes${buildPublicVacanciesQuery(filters)}`)
  return normalizeOpportunityListResponse(data)
}

export async function getPublicVacancyDetail(
  vacancyId: string
): Promise<OpportunityVacancyDetail | null> {
  const data = await apiClient.get(`/api/vacantes/${encodeURIComponent(vacancyId)}`)
  return normalizeOpportunityDetail(data)
}
