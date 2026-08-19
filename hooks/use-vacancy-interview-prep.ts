"use client"

import { useCallback, useState } from "react"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { overlayVacancyApplicants } from "@/lib/api/vacancy-applications"
import {
  parseVacancyInterviewPrepPayload,
  type VacancyInterviewPrepParseResult,
} from "@/lib/recruiter/vacancy-applicant-interview-prep"

/**
 * Carga `applicants` desde `GET /api/recruiter/vacancies/{vacancyId}` para el drawer operativo.
 *
 * **Evolución si el payload es pesado:** sustituir la URL por un endpoint de proyección acordado con backend, por ejemplo
 * `GET /api/recruiter/vacancies/{vacancyId}/interview-prep-summary`, manteniendo el mismo shape parseado en cliente
 * o adaptando `parseVacancyInterviewPrepPayload` a la nueva respuesta.
 */
export interface UseVacancyInterviewPrepResult {
  data: VacancyInterviewPrepParseResult | null
  loading: boolean
  error: string | null
  load: () => Promise<void>
  reset: () => void
}

export function useVacancyInterviewPrep(
  vacancyId: string
): UseVacancyInterviewPrepResult {
  const [data, setData] = useState<VacancyInterviewPrepParseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  const load = useCallback(async () => {
    if (!vacancyId.trim()) {
      setError("Falta el identificador de la vacante.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const raw = await apiClient.get(
        `/api/recruiter/vacancies/${encodeURIComponent(vacancyId)}`
      )
      const withApplicants = await overlayVacancyApplicants(vacancyId, raw)
      setData(parseVacancyInterviewPrepPayload(withApplicants))
    } catch (err: unknown) {
      setData(null)
      setError(
        getApiErrorMessage(err) ??
          "No se pudo cargar la información de candidatos."
      )
    } finally {
      setLoading(false)
    }
  }, [vacancyId])

  return { data, loading, error, load, reset }
}
