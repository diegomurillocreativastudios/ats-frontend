import { apiClient, type ApiClientError } from "@/lib/api"

export interface InterviewFeedbackResponse {
  previousMatchScore: number
  matchScore: number
  delta: number
  feedbackId?: string
  qualitativeWeight?: number
  scoredAt?: string
}

export type InterviewFeedbackConflictKind =
  | "not_interview_stage"
  | "vacancy_not_editable"

export type InterviewFeedbackToastKind =
  | "increased"
  | "decreased"
  | "unchanged"
  | "unchangedNoWeight"

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function readStatus(err: unknown): number {
  if (typeof err !== "object" || err == null) return 0
  if ("status" in err && typeof (err as ApiClientError).status === "number") {
    return (err as ApiClientError).status
  }
  return 0
}

function readErrorMessage(err: unknown): string {
  if (typeof err !== "object" || err == null) return ""
  const withBody = err as ApiClientError
  const body = asRecord(withBody.body)
  const fromBody =
    typeof body.message === "string"
      ? body.message
      : typeof body.detail === "string"
        ? body.detail
        : ""
  if (fromBody.trim()) return fromBody.trim()
  if (err instanceof Error && err.message.trim()) return err.message.trim()
  return ""
}

/**
 * Maps a 0–1 match score to whole percentage points (0.73 → 73).
 */
export function toPercentPoints(score01: number): number {
  return Math.round(score01 * 100)
}

/**
 * Maps a 0–1 delta to signed percentage points (0.08 → 8, -0.07 → -7).
 */
export function toDeltaPoints(delta01: number): number {
  return Math.round(delta01 * 100)
}

export function signedDeltaPointsLabel(delta01: number): string {
  const points = toDeltaPoints(delta01)
  return points > 0 ? `+${points}` : String(points)
}

export function parseInterviewFeedbackResponse(
  raw: unknown
): InterviewFeedbackResponse {
  const rec = asRecord(raw)
  const previousMatchScore = readFiniteNumber(rec.previousMatchScore)
  const matchScore = readFiniteNumber(rec.matchScore)
  const delta = readFiniteNumber(rec.delta)
  if (previousMatchScore == null || matchScore == null || delta == null) {
    throw new Error("Invalid interview feedback response")
  }

  const qualitativeWeight = readFiniteNumber(rec.qualitativeWeight)
  const feedbackId =
    rec.feedbackId != null && String(rec.feedbackId).trim() !== ""
      ? String(rec.feedbackId)
      : undefined
  const scoredAt =
    rec.scoredAt != null && String(rec.scoredAt).trim() !== ""
      ? String(rec.scoredAt)
      : undefined

  return {
    previousMatchScore,
    matchScore,
    delta,
    ...(feedbackId ? { feedbackId } : {}),
    ...(qualitativeWeight != null ? { qualitativeWeight } : {}),
    ...(scoredAt ? { scoredAt } : {}),
  }
}

export function resolveInterviewFeedbackToastKind(
  result: InterviewFeedbackResponse
): InterviewFeedbackToastKind {
  const deltaPoints = toDeltaPoints(result.delta)
  if (deltaPoints > 0) return "increased"
  if (deltaPoints < 0) return "decreased"
  if (result.qualitativeWeight === 0) return "unchangedNoWeight"
  return "unchanged"
}

export function classifyInterviewFeedbackConflict(
  err: unknown
): InterviewFeedbackConflictKind | null {
  if (readStatus(err) !== 409) return null
  const message = readErrorMessage(err).toLowerCase()
  if (message.includes("not editable")) return "vacancy_not_editable"
  return "not_interview_stage"
}

export function interviewFeedbackErrorKey(err: unknown): string {
  const status = readStatus(err)
  if (status === 400) return "errorInvalid"
  if (status === 403) return "errorForbidden"
  if (status === 404) return "errorNotFound"
  if (status === 409) {
    return classifyInterviewFeedbackConflict(err) === "vacancy_not_editable"
      ? "conflictVacancyNotEditable"
      : "conflictNotInterview"
  }
  if (status === 502) return "errorScoringFailed"
  return "errorGeneric"
}

/**
 * Submits recruiter interview feedback for an application in the interview stage.
 * Body field is `feedback` (never `comments`).
 */
export async function submitInterviewFeedback(
  applicationId: string,
  feedback: string
): Promise<InterviewFeedbackResponse> {
  const id = applicationId.trim()
  const text = feedback.trim()
  if (!id) {
    throw new Error("Missing application id")
  }
  const raw = await apiClient.post(
    `/api/recruiter/applications/${encodeURIComponent(id)}/interview-feedback`,
    { feedback: text }
  )
  return parseInterviewFeedbackResponse(raw)
}
