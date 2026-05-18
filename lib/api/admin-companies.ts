import { apiClient } from "@/lib/api"

/**
 * Admin companies API (`AdminCompaniesController`).
 * - GET    /api/admin/companies?page&pageSize&includeInactive
 * - GET    /api/admin/companies/{companyId}
 * - POST   /api/admin/companies
 * - PUT    /api/admin/companies/{companyId}  (companyId in route only)
 * List shape: { page, pageSize, totalCount, items } — not rows/data.
 */

export interface AdminCompany {
  companyId: string
  name: string
  industry?: string
  isActive: boolean
  createdAt: string
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

/** Maps list/detail DTO (camelCase or snake_case). */
export function mapAdminCompany(raw: unknown): AdminCompany {
  const o = raw as Record<string, unknown>
  return {
    companyId: toStr(o.companyId ?? o.company_id ?? o.id),
    name: toStr(o.name),
    industry: toOptionalStr(o.industry),
    isActive: Boolean(o.isActive ?? o.is_active ?? true),
    createdAt: toStr(o.createdAt ?? o.created_at),
  }
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
