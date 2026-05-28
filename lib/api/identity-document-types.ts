import { apiClient } from "@/lib/api"

export interface IdentityDocumentTypeOptionDto {
  id: string
  code: string
  name: string
}

function toStringValue(value: unknown): string {
  if (value == null) return ""
  return String(value)
}

function mapIdentityDocumentTypeOption(
  raw: unknown
): IdentityDocumentTypeOptionDto {
  const item = raw as Record<string, unknown>

  return {
    id: toStringValue(item.id),
    code: toStringValue(item.code),
    name: toStringValue(item.name),
  }
}

function normalizeListPayload(
  payload: unknown
): IdentityDocumentTypeOptionDto[] {
  if (Array.isArray(payload)) {
    return payload.map(mapIdentityDocumentTypeOption)
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    const items = record.items ?? record.data ?? record.results

    if (Array.isArray(items)) {
      return items.map(mapIdentityDocumentTypeOption)
    }
  }

  return []
}

/**
 * Listado público de tipos de documento de identidad disponibles para clasificar
 * el documento de identidad cargado al crear un candidato (modal "Agregar candidato"
 * en /portal-rrhh/candidatos).
 */
export async function listIdentityDocumentTypes(): Promise<
  IdentityDocumentTypeOptionDto[]
> {
  const data = await apiClient.get("/api/identity-document-types")
  return normalizeListPayload(data)
}
