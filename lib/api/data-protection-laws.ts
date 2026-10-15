import { apiClient } from "@/lib/api"
import {
  mapVacancyDataProtectionLaw,
  type VacancyDataProtectionLaw,
} from "@/lib/vacancies/vacancy-data-protection-laws"

export type DataProtectionLaw = VacancyDataProtectionLaw

export interface DataProtectionLawWriteBody {
  displayName: string
  jurisdictionCode: string
  officialReference: string
  summary: string
  locale: string
  body: string
  isActive: boolean
}

export interface CreateDataProtectionLawBody extends DataProtectionLawWriteBody {
  code: string
}

function normalizeListPayload(payload: unknown): DataProtectionLaw[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as Record<string, unknown>).items ??
        (payload as Record<string, unknown>).data ??
        (payload as Record<string, unknown>).results)
      : null

  if (!Array.isArray(rows)) return []

  const laws: DataProtectionLaw[] = []
  for (const row of rows) {
    const law = mapVacancyDataProtectionLaw(row)
    if (law) laws.push(law)
  }
  return laws
}

function toWritePayload(body: DataProtectionLawWriteBody) {
  return {
    displayName: body.displayName.trim(),
    jurisdictionCode: body.jurisdictionCode.trim().toUpperCase(),
    officialReference: body.officialReference.trim(),
    summary: body.summary.trim(),
    locale: body.locale.trim(),
    body: body.body,
    isActive: body.isActive,
  }
}

export async function listAdminDataProtectionLaws(): Promise<DataProtectionLaw[]> {
  const data = await apiClient.get("/api/admin/data-protection-laws")
  return normalizeListPayload(data)
}

export async function getAdminDataProtectionLaw(id: string): Promise<DataProtectionLaw> {
  const data = await apiClient.get(
    `/api/admin/data-protection-laws/${encodeURIComponent(id)}`,
  )
  const law = mapVacancyDataProtectionLaw(data)
  if (!law) {
    throw new Error("Respuesta de ley inválida")
  }
  return law
}

export async function createAdminDataProtectionLaw(
  body: CreateDataProtectionLawBody,
): Promise<DataProtectionLaw> {
  const data = await apiClient.post("/api/admin/data-protection-laws", {
    ...toWritePayload(body),
    code: body.code.trim(),
  })
  const law = mapVacancyDataProtectionLaw(data)
  if (!law) {
    throw new Error("Respuesta de ley inválida")
  }
  return law
}

/** Updates the current law record. The code stays as it was created. */
export async function updateAdminDataProtectionLaw(
  id: string,
  body: DataProtectionLawWriteBody,
): Promise<DataProtectionLaw> {
  const data = await apiClient.put(
    `/api/admin/data-protection-laws/${encodeURIComponent(id)}`,
    toWritePayload(body),
  )
  const law = mapVacancyDataProtectionLaw(data)
  if (!law) {
    throw new Error("Respuesta de ley inválida")
  }
  return law
}

export async function deleteAdminDataProtectionLaw(id: string): Promise<void> {
  await apiClient.delete(`/api/admin/data-protection-laws/${encodeURIComponent(id)}`)
}

/** Active laws for the recruiter picker. The legal text is omitted. */
export async function listRecruiterDataProtectionLaws(): Promise<DataProtectionLaw[]> {
  const data = await apiClient.get("/api/recruiter/data-protection-laws")
  return normalizeListPayload(data).filter((law) => law.isActive)
}
