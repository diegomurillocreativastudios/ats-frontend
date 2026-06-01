import { apiClient } from "@/lib/api"

/** Ítem de listado `GET /api/admin/users`. */
export type AdminUserListItem = {
  id: string
  email: string
  userName: string
  emailConfirmed: boolean
  lockoutActive: boolean
  roles: string[]
}

export type AdminUserListResponse = {
  items: AdminUserListItem[]
  totalCount: number
  page: number
  pageSize: number
}

/** Detalle `GET /api/admin/users/{id}` y respuestas de mutación. */
export type AdminUserDetail = {
  id: string
  email: string
  userName: string
  emailConfirmed: boolean
  lockoutEnabled: boolean
  lockoutEnd: string | null
  lockoutActive: boolean
  roles: string[]
  createdAtUtc: string | null
}

export type AdminUsersListParams = {
  page?: number
  pageSize?: number
  email?: string
  role?: string
  lockedOnly?: boolean
}

function toStr(v: unknown): string {
  if (v == null) return ""
  return String(v)
}

function parseRoles(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((r) => String(r))
}

function mapListItem(raw: unknown): AdminUserListItem {
  const o = raw as Record<string, unknown>
  const roles = parseRoles(o.roles ?? o.Roles)
  return {
    id: toStr(o.id),
    email: toStr(o.email),
    userName: toStr(o.userName ?? o.user_name),
    emailConfirmed: Boolean(o.emailConfirmed ?? o.email_confirmed),
    lockoutActive: Boolean(o.lockoutActive ?? o.lockout_active),
    roles,
  }
}

function mapDetail(raw: unknown): AdminUserDetail {
  const o = raw as Record<string, unknown>
  const lockoutEnd = o.lockoutEnd ?? o.lockout_end
  const createdAt = o.createdAtUtc ?? o.created_at_utc
  return {
    id: toStr(o.id),
    email: toStr(o.email),
    userName: toStr(o.userName ?? o.user_name),
    emailConfirmed: Boolean(o.emailConfirmed ?? o.email_confirmed),
    lockoutEnabled: Boolean(o.lockoutEnabled ?? o.lockout_enabled),
    lockoutEnd:
      lockoutEnd == null || lockoutEnd === ""
        ? null
        : String(lockoutEnd),
    lockoutActive: Boolean(o.lockoutActive ?? o.lockout_active),
    roles: parseRoles(o.roles ?? o.Roles),
    createdAtUtc:
      createdAt == null || createdAt === ""
        ? null
        : String(createdAt),
  }
}

export async function fetchAdminUsersList(
  params: AdminUsersListParams = {}
): Promise<AdminUserListResponse> {
  const sp = new URLSearchParams()
  if (params.page != null && params.page > 0) {
    sp.set("page", String(params.page))
  }
  if (params.pageSize != null && params.pageSize > 0) {
    sp.set("pageSize", String(params.pageSize))
  }
  if (params.email?.trim()) sp.set("email", params.email.trim())
  if (params.role?.trim()) sp.set("role", params.role.trim())
  if (params.lockedOnly === true) sp.set("lockedOnly", "true")

  const qs = sp.toString()
  const path = qs ? `/api/admin/users?${qs}` : "/api/admin/users"
  const data = (await apiClient.get(path)) as Record<string, unknown>
  const itemsRaw = data.items
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(mapListItem)
    : []

  return {
    items,
    totalCount: Number(data.totalCount ?? data.total_count ?? 0) || 0,
    page: Number(data.page ?? 1) || 1,
    pageSize: Number(data.pageSize ?? data.page_size ?? 20) || 20,
  }
}

const ADMIN_USERS_PAGE_CHUNK = 200

/**
 * Recorre la paginación de `GET /api/admin/users` hasta cubrir `role` (p. ej. `Recruiter`).
 */
export async function fetchAdminUsersAllByRole(
  role: string
): Promise<AdminUserListItem[]> {
  const all: AdminUserListItem[] = []
  let page = 1
  for (;;) {
    const res = await fetchAdminUsersList({
      role,
      page,
      pageSize: ADMIN_USERS_PAGE_CHUNK,
    })
    all.push(...res.items)
    if (res.items.length < ADMIN_USERS_PAGE_CHUNK) break
    if (all.length >= res.totalCount && res.totalCount > 0) break
    page += 1
    if (page > 100) break
  }
  return all
}

export async function fetchAdminUserById(id: string): Promise<AdminUserDetail> {
  const data = await apiClient.get(
    `/api/admin/users/${encodeURIComponent(id)}`
  )
  return mapDetail(data)
}

export type CreateAdminUserBody = {
  email: string
  password?: string
  roleNames?: string[]
}

export async function createAdminUser(
  body: CreateAdminUserBody
): Promise<AdminUserDetail> {
  const data = await apiClient.post("/api/admin/users", body)
  return mapDetail(data)
}

export async function patchAdminUser(
  id: string,
  body: {
    lockoutEnabled?: boolean | null
    emailConfirmed?: boolean | null
    /** Si el backend lo soporta en PATCH /api/admin/users/{id} */
    userName?: string | null
  }
): Promise<AdminUserDetail> {
  const data = await apiClient.patch(
    `/api/admin/users/${encodeURIComponent(id)}`,
    body
  )
  return mapDetail(data)
}

export async function setAdminUserLockout(
  id: string,
  lockoutEnabled: boolean
): Promise<AdminUserDetail> {
  return patchAdminUser(id, { lockoutEnabled })
}

export async function postAdminUserRoles(
  id: string,
  roleNames: string[]
): Promise<AdminUserDetail> {
  const data = await apiClient.post(
    `/api/admin/users/${encodeURIComponent(id)}/roles`,
    { roleNames }
  )
  return mapDetail(data)
}

export async function deleteAdminUserRole(
  id: string,
  roleName: string
): Promise<AdminUserDetail> {
  const data = await apiClient.delete(
    `/api/admin/users/${encodeURIComponent(id)}/roles/${encodeURIComponent(roleName)}`
  )
  return mapDetail(data)
}

export type SendPasswordResetResponse = { ok: boolean; message?: string }

export async function postAdminUserSendPasswordReset(
  id: string
): Promise<SendPasswordResetResponse> {
  return apiClient.post(
    `/api/admin/users/${encodeURIComponent(id)}/send-password-reset`,
    {}
  ) as Promise<SendPasswordResetResponse>
}
