import { apiClient } from "@/lib/api"

export interface CandidateEvaluation {
  evalMonth: number | null
  evalComments: string | null
}

export interface UpdateCandidateEvaluationPayload {
  evalMonth?: number | null
  evalComments?: string | null
}

export interface UpdateCandidateEvaluationsPayload {
  evaluations: CandidateEvaluation[]
}

/**
 * Actualiza la evaluación de un candidato (endpoint singular - deprecated).
 * PATCH /api/recruiter/candidates/{id}/evaluation
 * @deprecated Use updateCandidateEvaluations instead
 */
export async function updateCandidateEvaluation(
  candidateId: string,
  payload: UpdateCandidateEvaluationPayload
): Promise<unknown> {
  return apiClient.patch(
    `/api/recruiter/candidates/${candidateId}/evaluation`,
    payload
  )
}

/**
 * Actualiza múltiples evaluaciones de un candidato.
 * PATCH /api/recruiter/candidates/{id}/evaluations
 */
export async function updateCandidateEvaluations(
  candidateId: string,
  payload: UpdateCandidateEvaluationsPayload
): Promise<unknown> {
  return apiClient.patch(
    `/api/recruiter/candidates/${candidateId}/evaluations`,
    payload
  )
}
