import { apiClient } from "@/lib/api"

export interface IdentityDocumentTypeResponseDto {
  id: string
  code: string
  name: string
  createdAtUtc: string
  createdByUserId: string | null
  updatedAtUtc: string | null
  updatedByUserId: string | null
}

export interface CreateIdentityDocumentTypeRequestDto {
  code: string
  name: string
}

export interface UpdateIdentityDocumentTypeRequestDto {
  code: string
  name: string
}

export interface MessageResponseDto {
  message: string
}

function toStringValue(value: unknown): string {
  if (value == null) return ""
  return String(value)
}

function toOptionalStringValue(value: unknown): string | null {
  const normalized = toStringValue(value).trim()
  return normalized === "" ? null : normalized
}

function mapIdentityDocumentType(raw: unknown): IdentityDocumentTypeResponseDto {
  const item = raw as Record<string, unknown>

  return {
    id: toStringValue(item.id),
    code: toStringValue(item.code),
    name: toStringValue(item.name),
    createdAtUtc: toStringValue(item.createdAtUtc ?? item.created_at_utc),
    createdByUserId: toOptionalStringValue(
      item.createdByUserId ?? item.created_by_user_id
    ),
    updatedAtUtc: toOptionalStringValue(
      item.updatedAtUtc ?? item.updated_at_utc
    ),
    updatedByUserId: toOptionalStringValue(
      item.updatedByUserId ?? item.updated_by_user_id
    ),
  }
}

function normalizeListPayload(
  payload: unknown
): IdentityDocumentTypeResponseDto[] {
  if (Array.isArray(payload)) {
    return payload.map(mapIdentityDocumentType)
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    const items = record.items ?? record.data ?? record.results

    if (Array.isArray(items)) {
      return items.map(mapIdentityDocumentType)
    }
  }

  return []
}

export async function listAdminIdentityDocumentTypes(): Promise<
  IdentityDocumentTypeResponseDto[]
> {
  const data = await apiClient.get("/api/admin/identity-document-types")
  return normalizeListPayload(data)
}

export async function getAdminIdentityDocumentTypeById(
  id: string
): Promise<IdentityDocumentTypeResponseDto> {
  const data = await apiClient.get(
    `/api/admin/identity-document-types/${encodeURIComponent(id)}`
  )
  return mapIdentityDocumentType(data)
}

export async function createAdminIdentityDocumentType(
  payload: CreateIdentityDocumentTypeRequestDto
): Promise<IdentityDocumentTypeResponseDto> {
  const data = await apiClient.post("/api/admin/identity-document-types", {
    code: payload.code.trim(),
    name: payload.name.trim(),
  })
  return mapIdentityDocumentType(data)
}

export async function updateAdminIdentityDocumentType(
  id: string,
  payload: UpdateIdentityDocumentTypeRequestDto
): Promise<IdentityDocumentTypeResponseDto> {
  const data = await apiClient.put(
    `/api/admin/identity-document-types/${encodeURIComponent(id)}`,
    {
      code: payload.code.trim(),
      name: payload.name.trim(),
    }
  )
  return mapIdentityDocumentType(data)
}

export async function deleteAdminIdentityDocumentType(
  id: string
): Promise<void> {
  await apiClient.delete(
    `/api/admin/identity-document-types/${encodeURIComponent(id)}`
  )
}
