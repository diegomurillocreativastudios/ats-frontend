import { apiClient } from "@/lib/api"

/**
 * Admin companies API (`AdminCompaniesController`).
 * - GET    /api/admin/companies?page&pageSize&includeInactive
 * - GET    /api/admin/companies/{companyId}
 * - POST   /api/admin/companies                       (application/json)
 * - POST   /api/admin/companies                       (multipart/form-data, optional logo)
 * - PUT    /api/admin/companies/{companyId}           (application/json, no logo)
 * - PUT    /api/admin/companies/{companyId}           (multipart/form-data, replaces logo)
 * - DELETE /api/admin/companies/{companyId}/logo
 *
 * Detail shape: { companyId, name, industry, isActive, createdAt, logo }
 * where `logo` is `null` or { logoFileId, contentType, fileName, sizeBytes, base64 }.
 * List rows include a `hasLogo` flag (binary is never returned in listings).
 */

export interface AdminCompanyLogo {
  logoFileId: string
  contentType: string
  fileName?: string
  sizeBytes: number
  base64: string
}

export interface AdminCompany {
  companyId: string
  name: string
  industry?: string
  isActive: boolean
  createdAt: string
  hasLogo: boolean
  logo: AdminCompanyLogo | null
}

export interface AdminCompanyListResponse {
  page: number
  pageSize: number
  totalCount: number
  items: AdminCompany[]
}

export interface AdminCompanyFormValues {
  name: string
  industry?: string
  isActive: boolean
}

export interface AdminCompaniesListParams {
  page?: number
  pageSize?: number
  includeInactive?: boolean
}

function toStr(value: unknown): string {
  if (value == null) return ""
  return String(value)
}

function toOptionalStr(value: unknown): string | undefined {
  const normalized = toStr(value).trim()
  return normalized === "" ? undefined : normalized
}

function mapLogo(raw: unknown): AdminCompanyLogo | null {
  if (raw == null) return null
  const o = raw as Record<string, unknown>
  const base64 = toStr(o.base64 ?? o.Base64)
  if (!base64) return null
  return {
    logoFileId: toStr(o.logoFileId ?? o.logo_file_id ?? o.LogoFileId),
    contentType: toStr(o.contentType ?? o.content_type ?? o.ContentType),
    fileName: toOptionalStr(o.fileName ?? o.file_name ?? o.FileName),
    sizeBytes: Number(o.sizeBytes ?? o.size_bytes ?? o.SizeBytes ?? 0) || 0,
    base64,
  }
}

/** Maps list/detail DTO (camelCase or snake_case). */
export function mapAdminCompany(raw: unknown): AdminCompany {
  const o = raw as Record<string, unknown>
  const logo = mapLogo(o.logo ?? o.Logo)
  const hasLogoRaw = o.hasLogo ?? o.has_logo ?? o.HasLogo
  return {
    companyId: toStr(o.companyId ?? o.company_id ?? o.id),
    name: toStr(o.name),
    industry: toOptionalStr(o.industry),
    isActive: Boolean(o.isActive ?? o.is_active ?? true),
    createdAt: toStr(o.createdAt ?? o.created_at),
    hasLogo: hasLogoRaw != null ? Boolean(hasLogoRaw) : logo != null,
    logo,
  }
}

/** Builds a data URI usable directly in `<img src>` from the inline logo payload. */
export function buildLogoDataUri(logo: AdminCompanyLogo | null): string | null {
  if (!logo || !logo.base64) return null
  const ct = logo.contentType || "image/png"
  return `data:${ct};base64,${logo.base64}`
}

export async function fetchAdminCompaniesList(
  params: AdminCompaniesListParams = {}
): Promise<AdminCompanyListResponse> {
  const sp = new URLSearchParams()
  const page = params.page != null && params.page > 0 ? params.page : 1
  const pageSize =
    params.pageSize != null && params.pageSize > 0
      ? Math.min(params.pageSize, 100)
      : 50

  sp.set("page", String(page))
  sp.set("pageSize", String(pageSize))
  if (params.includeInactive === true) {
    sp.set("includeInactive", "true")
  }

  const data = (await apiClient.get(
    `/api/admin/companies?${sp.toString()}`
  )) as Record<string, unknown>

  const itemsRaw = data.items ?? data.Items
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(mapAdminCompany)
    : []

  return {
    items,
    totalCount: Number(data.totalCount ?? data.total_count ?? 0) || 0,
    page: Number(data.page ?? data.Page ?? page) || page,
    pageSize: Number(data.pageSize ?? data.page_size ?? pageSize) || pageSize,
  }
}

export async function fetchAdminCompanyById(
  companyId: string
): Promise<AdminCompany> {
  const data = await apiClient.get(
    `/api/admin/companies/${encodeURIComponent(companyId)}`
  )
  return mapAdminCompany(data)
}

export async function createAdminCompany(
  body: AdminCompanyFormValues
): Promise<AdminCompany> {
  const data = await apiClient.post("/api/admin/companies", {
    name: body.name.trim(),
    industry: body.industry?.trim() || null,
    isActive: body.isActive,
  })
  return mapAdminCompany(data)
}

/**
 * Creates a company and (optionally) attaches a logo in a single multipart call.
 * Uses the `POST /api/admin/companies` multipart variant.
 */
export async function createAdminCompanyWithLogo(
  body: AdminCompanyFormValues,
  logo: Blob | null
): Promise<AdminCompany> {
  const formData = new FormData()
  formData.append("name", body.name.trim())
  if (body.industry?.trim()) {
    formData.append("industry", body.industry.trim())
  }
  formData.append("isActive", body.isActive ? "true" : "false")
  if (logo) {
    const filename = logo instanceof File && logo.name ? logo.name : "logo"
    formData.append("logo", logo, filename)
  }
  const data = await apiClient.postFormData("/api/admin/companies", formData)
  return mapAdminCompany(data)
}

export async function updateAdminCompany(
  companyId: string,
  body: AdminCompanyFormValues
): Promise<AdminCompany> {
  const data = await apiClient.put(
    `/api/admin/companies/${encodeURIComponent(companyId)}`,
    {
      name: body.name.trim(),
      industry: body.industry?.trim() || null,
      isActive: body.isActive,
    }
  )
  return mapAdminCompany(data)
}

/**
 * Updates company metadata and replaces the logo in a single multipart call.
 * Uses the `PUT /api/admin/companies/{companyId}` multipart variant.
 */
export async function updateAdminCompanyWithLogo(
  companyId: string,
  body: AdminCompanyFormValues,
  logo: Blob
): Promise<AdminCompany> {
  const formData = new FormData()
  formData.append("name", body.name.trim())
  if (body.industry?.trim()) {
    formData.append("industry", body.industry.trim())
  }
  formData.append("isActive", body.isActive ? "true" : "false")
  const filename = logo instanceof File && logo.name ? logo.name : "logo"
  formData.append("logo", logo, filename)
  const data = await apiClient.putFormData(
    `/api/admin/companies/${encodeURIComponent(companyId)}`,
    formData
  )
  return mapAdminCompany(data)
}

/** Removes the active logo of a company (DB row + blob). */
export async function deleteAdminCompanyLogo(companyId: string): Promise<void> {
  await apiClient.delete(
    `/api/admin/companies/${encodeURIComponent(companyId)}/logo`
  )
}
