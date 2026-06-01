import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

export interface FinishVacancyProcessPayload {
  calification: number
  comments: string
}

export interface FinishVacancyProcessResponse {
  message: string
  vacancyId: string
  isVacancyDone: boolean
  calification: number
  comments: string | null
}

export async function finishVacancyProcess(
  vacancyId: string,
  payload: FinishVacancyProcessPayload
): Promise<FinishVacancyProcessResponse> {
  const id = String(vacancyId ?? "").trim()
  if (!id) {
    throw new Error("Falta el id de la vacante.")
  }

  if (payload.calification < 1 || payload.calification > 5) {
    throw new Error("La calificación debe estar entre 1 y 5.")
  }

  try {
    const response = await apiClient.post(
      `/api/recruiter/vacancies/${encodeURIComponent(id)}/finish-process`,
      {
        calification: payload.calification,
        comments: payload.comments || null,
      }
    )

    return response as FinishVacancyProcessResponse
  } catch (error) {
    const message = getApiErrorMessage(error)
    throw new Error(message || "No se pudo finalizar el proceso de la vacante.")
  }
}
