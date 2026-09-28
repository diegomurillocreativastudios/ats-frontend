import { apiClient, type ApiClientError } from "@/lib/api"

export interface InterviewFeedbackResponse {
  previousMatchScore: number
  matchScore: number
  delta: number
  feedbackId?: string
  qualitativeWeight?: number
  scoredAt?: string
}

export interface InterviewFeedbackSoftSkillOption {
  id: string
  code: string
  displayName: string
  sortOrder: number
}

export interface InterviewFeedbackTechnicalSkillOption {
  requirementKey: string
  expectedValue: string
}

export interface InterviewFeedbackSoftSkillScore {
  softSkillId: string
  displayName?: string
  score: number
}

export interface InterviewFeedbackTechnicalSkillScore {
  requirementKey: string
  expectedValue?: string
  score: number
}

export interface InterviewFeedbackEntry {
  id: string
  feedback: string
  createdBy: string
  createdAt: string
  previousMatchScore: number
  matchScore: number
  delta: number
  softSkills: InterviewFeedbackSoftSkillScore[]
  technicalSkills: InterviewFeedbackTechnicalSkillScore[]
}

export interface InterviewFeedbackForm {
  interviewDone: boolean
  softSkills: InterviewFeedbackSoftSkillOption[]
  technicalSkills: InterviewFeedbackTechnicalSkillOption[]
  entries: InterviewFeedbackEntry[]
}

export interface SubmitInterviewFeedbackPayload {
  feedback: string
  softSkills: Array<{ softSkillId: string; score: number }>
  technicalSkills: Array<{ requirementKey: string; score: number }>
}

export type InterviewFeedbackConflictKind =
  | "not_interview_stage"
  | "vacancy_not_editable"
  | "interview_not_done"

export type InterviewFeedbackToastKind =
  | "increased"
  | "decreased"
  | "unchanged"
  | "unchangedNoWeight"

const SCORE_MIN = 1
const SCORE_MAX = 10

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

function readErrorCode(err: unknown): string {
  if (typeof err !== "object" || err == null) return ""
  const body = asRecord((err as ApiClientError).body)
  const code = body.code
  return typeof code === "string" ? code.trim().toLowerCase() : ""
}

function feedbackPath(applicationId: string): string {
  return `/api/recruiter/applications/${encodeURIComponent(applicationId)}/interview-feedback`
}

function isValidScore(score: number): boolean {
  return (
    Number.isInteger(score) && score >= SCORE_MIN && score <= SCORE_MAX
  )
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

function parseSoftSkillOption(
  raw: unknown
): InterviewFeedbackSoftSkillOption | null {
  const rec = asRecord(raw)
  const id = String(rec.id ?? "").trim()
  if (!id) return null
  return {
    id,
    code: String(rec.code ?? "").trim(),
    displayName: String(rec.displayName ?? rec.code ?? id).trim() || id,
    sortOrder: readFiniteNumber(rec.sortOrder) ?? 0,
  }
}

function parseTechnicalSkillOption(
  raw: unknown
): InterviewFeedbackTechnicalSkillOption | null {
  const rec = asRecord(raw)
  const requirementKey = String(rec.requirementKey ?? "").trim()
  if (!requirementKey) return null
  return {
    requirementKey,
    expectedValue: String(rec.expectedValue ?? "").trim(),
  }
}

function parseSoftSkillScore(
  raw: unknown
): InterviewFeedbackSoftSkillScore | null {
  const rec = asRecord(raw)
  const softSkillId = String(rec.softSkillId ?? "").trim()
  const score = readFiniteNumber(rec.score)
  if (!softSkillId || score == null) return null
  const displayName =
    rec.displayName != null && String(rec.displayName).trim() !== ""
      ? String(rec.displayName).trim()
      : undefined
  return {
    softSkillId,
    score,
    ...(displayName ? { displayName } : {}),
  }
}

function parseTechnicalSkillScore(
  raw: unknown
): InterviewFeedbackTechnicalSkillScore | null {
  const rec = asRecord(raw)
  const requirementKey = String(rec.requirementKey ?? "").trim()
  const score = readFiniteNumber(rec.score)
  if (!requirementKey || score == null) return null
  const expectedValue =
    rec.expectedValue != null && String(rec.expectedValue).trim() !== ""
      ? String(rec.expectedValue).trim()
      : undefined
  return {
    requirementKey,
    score,
    ...(expectedValue ? { expectedValue } : {}),
  }
}

function parseFeedbackEntry(raw: unknown): InterviewFeedbackEntry | null {
  const rec = asRecord(raw)
  const id = String(rec.id ?? "").trim()
  const feedback = String(rec.feedback ?? "").trim()
  const previousMatchScore = readFiniteNumber(rec.previousMatchScore)
  const matchScore = readFiniteNumber(rec.matchScore)
  const delta = readFiniteNumber(rec.delta)
  if (
    !id ||
    previousMatchScore == null ||
    matchScore == null ||
    delta == null
  ) {
    return null
  }

  const softSkills = Array.isArray(rec.softSkills)
    ? rec.softSkills
        .map(parseSoftSkillScore)
        .filter((item): item is InterviewFeedbackSoftSkillScore => item != null)
    : []
  const technicalSkills = Array.isArray(rec.technicalSkills)
    ? rec.technicalSkills
        .map(parseTechnicalSkillScore)
        .filter(
          (item): item is InterviewFeedbackTechnicalSkillScore => item != null
        )
    : []

  return {
    id,
    feedback,
    createdBy: String(rec.createdBy ?? "").trim(),
    createdAt: String(rec.createdAt ?? "").trim(),
    previousMatchScore,
    matchScore,
    delta,
    softSkills,
    technicalSkills,
  }
}

export function parseInterviewFeedbackForm(raw: unknown): InterviewFeedbackForm {
  const rec = asRecord(raw)
  const softSkills = Array.isArray(rec.softSkills)
    ? rec.softSkills
        .map(parseSoftSkillOption)
        .filter(
          (item): item is InterviewFeedbackSoftSkillOption => item != null
        )
        .sort((left, right) => {
          if (left.sortOrder !== right.sortOrder) {
            return left.sortOrder - right.sortOrder
          }
          return left.displayName.localeCompare(right.displayName, "es", {
            sensitivity: "base",
          })
        })
    : []
  const technicalSkills = Array.isArray(rec.technicalSkills)
    ? rec.technicalSkills
        .map(parseTechnicalSkillOption)
        .filter(
          (item): item is InterviewFeedbackTechnicalSkillOption => item != null
        )
    : []
  const entries = Array.isArray(rec.entries)
    ? rec.entries
        .map(parseFeedbackEntry)
        .filter((item): item is InterviewFeedbackEntry => item != null)
    : []

  return {
    interviewDone: Boolean(rec.interviewDone),
    softSkills,
    technicalSkills,
    entries,
  }
}

/**
 * Ensures every soft/technical skill from the form has an integer score 1–10.
 */
export function validateInterviewFeedbackCoverage(params: {
  softSkillIds: readonly string[]
  technicalRequirementKeys: readonly string[]
  softSkills: Array<{ softSkillId: string; score: number | null }>
  technicalSkills: Array<{ requirementKey: string; score: number | null }>
}): boolean {
  if (params.softSkills.length !== params.softSkillIds.length) return false
  if (params.technicalSkills.length !== params.technicalRequirementKeys.length) {
    return false
  }

  const softIds = new Set(params.softSkillIds)
  for (const item of params.softSkills) {
    if (!softIds.has(item.softSkillId)) return false
    softIds.delete(item.softSkillId)
    if (item.score == null || !isValidScore(item.score)) return false
  }
  if (softIds.size > 0) return false

  const techKeys = new Set(params.technicalRequirementKeys)
  for (const item of params.technicalSkills) {
    if (!techKeys.has(item.requirementKey)) return false
    techKeys.delete(item.requirementKey)
    if (item.score == null || !isValidScore(item.score)) return false
  }
  return techKeys.size === 0
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
  const code = readErrorCode(err)
  if (code === "interview_not_done") return "interview_not_done"
  if (code === "vacancy_not_editable") return "vacancy_not_editable"
  if (code === "not_interview_stage") return "not_interview_stage"

  const message = readErrorMessage(err).toLowerCase()
  if (message.includes("not editable")) return "vacancy_not_editable"
  if (
    message.includes("interview has not been marked as done") ||
    message.includes("interview_not_done") ||
    message.includes("not been marked as done")
  ) {
    return "interview_not_done"
  }
  return "not_interview_stage"
}

export function interviewFeedbackErrorKey(err: unknown): string {
  const status = readStatus(err)
  if (status === 400) return "errorInvalid"
  if (status === 403) return "errorForbidden"
  if (status === 404) return "errorNotFound"
  if (status === 409) {
    const conflict = classifyInterviewFeedbackConflict(err)
    if (conflict === "vacancy_not_editable") return "conflictVacancyNotEditable"
    if (conflict === "interview_not_done") return "conflictInterviewNotDone"
    return "conflictNotInterview"
  }
  if (status === 502) return "errorScoringFailed"
  return "errorGeneric"
}

/**
 * Loads the interview feedback form (active soft skills, vacancy requirements, history).
 */
export async function fetchInterviewFeedbackForm(
  applicationId: string
): Promise<InterviewFeedbackForm> {
  const id = applicationId.trim()
  if (!id) {
    throw new Error("Missing application id")
  }
  const raw = await apiClient.get(feedbackPath(id))
  return parseInterviewFeedbackForm(raw)
}

/**
 * Submits recruiter interview feedback for an application in the interview stage.
 * Body fields are `feedback`, `softSkills`, and `technicalSkills`.
 */
export async function submitInterviewFeedback(
  applicationId: string,
  payload: SubmitInterviewFeedbackPayload
): Promise<InterviewFeedbackResponse> {
  const id = applicationId.trim()
  const text = payload.feedback.trim()
  if (!id) {
    throw new Error("Missing application id")
  }
  if (!text) {
    throw new Error("Missing feedback text")
  }

  const softSkills = payload.softSkills.map((item) => ({
    softSkillId: item.softSkillId,
    score: item.score,
  }))
  const technicalSkills = payload.technicalSkills.map((item) => ({
    requirementKey: item.requirementKey,
    score: item.score,
  }))

  if (
    !validateInterviewFeedbackCoverage({
      softSkillIds: softSkills.map((item) => item.softSkillId),
      technicalRequirementKeys: technicalSkills.map(
        (item) => item.requirementKey
      ),
      softSkills,
      technicalSkills,
    })
  ) {
    throw new Error("Incomplete interview feedback scores")
  }

  const raw = await apiClient.post(feedbackPath(id), {
    feedback: text,
    softSkills,
    technicalSkills,
  })
  return parseInterviewFeedbackResponse(raw)
}
