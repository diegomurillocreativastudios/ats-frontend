import { apiClient } from "@/lib/api"

/** Respuesta de GET /api/candidate/applications/by-vacancy/{vacancyId}. */
export interface CandidateApplicationByVacancy {
  hasApplied: boolean
  applicationId?: string | null
  statusLabel?: string | null
  currentStageId?: string | null
  currentStageName?: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed !== "" ? trimmed : null
}

/** Normaliza el payload del check “¿ya apliqué?”. */
export function normalizeCandidateApplicationByVacancy(
  raw: unknown
): CandidateApplicationByVacancy {
  const record = asRecord(raw)
  if (!record) {
    return { hasApplied: false }
  }

  const hasApplied = Boolean(record.hasApplied ?? record.HasApplied)

  return {
    hasApplied,
    applicationId: asOptionalString(
      record.applicationId ?? record.ApplicationId
    ),
    statusLabel: asOptionalString(record.statusLabel ?? record.StatusLabel),
    currentStageId: asOptionalString(
      record.currentStageId ?? record.CurrentStageId
    ),
    currentStageName: asOptionalString(
      record.currentStageName ?? record.CurrentStageName
    ),
  }
}

/**
 * Consulta si el candidato autenticado ya postuló a la vacante.
 * Requiere sesión JWT de candidato (vía BFF).
 */
export async function fetchCandidateApplicationByVacancy(
  vacancyId: string
): Promise<CandidateApplicationByVacancy> {
  const id = vacancyId.trim()
  if (!id) {
    return { hasApplied: false }
  }

  const raw = await apiClient.get(
    `/api/candidate/applications/by-vacancy/${encodeURIComponent(id)}`
  )
  return normalizeCandidateApplicationByVacancy(raw)
}
