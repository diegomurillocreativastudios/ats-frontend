/**
 * Identity of the unique Kanban interview stage is the `isInterviewStage` flag only.
 * Never match on persisted names such as "Interview" or "Entrevista".
 */

export interface InterviewStageFlags {
  final?: boolean
  isHiredStage?: boolean
  isInterviewStage?: boolean
}

/**
 * Reads the interview-stage flag from a catalog payload (camelCase, snake_case, or PascalCase).
 */
export function readIsInterviewStageFromApi(
  item: Record<string, unknown> | null | undefined
): boolean {
  if (item == null) return false
  return Boolean(
    item.isInterviewStage ?? item.is_interview_stage ?? item.IsInterviewStage
  )
}

export function isInterviewPipelineStage(
  stage: Pick<InterviewStageFlags, "isInterviewStage"> | null | undefined
): boolean {
  return stage?.isInterviewStage === true
}

/**
 * Backend rejects combining the interview stage with `final` or `isHiredStage`.
 */
export function canEnableInterviewStage(
  stage: Pick<InterviewStageFlags, "final" | "isHiredStage"> | null | undefined
): boolean {
  if (stage == null) return false
  return stage.final !== true && stage.isHiredStage !== true
}

export function canEnableFinalOrHiredStage(
  stage: Pick<InterviewStageFlags, "isInterviewStage"> | null | undefined
): boolean {
  return stage?.isInterviewStage !== true
}

export function canShowInterviewFeedbackAction(params: {
  isInterviewStage: boolean
  applicationId?: string | null
  readOnly?: boolean
}): boolean {
  if (params.readOnly) return false
  if (params.isInterviewStage !== true) return false
  return String(params.applicationId ?? "").trim() !== ""
}

export function readApplicationId(
  match: { applicationId?: string | null; application_id?: string | null } | null | undefined
): string | null {
  const direct = match?.applicationId ?? match?.application_id
  if (direct == null) return null
  const trimmed = String(direct).trim()
  return trimmed === "" ? null : trimmed
}

/**
 * Optimistic catalog update: enabling interview on one stage clears the flag on the rest.
 */
export function applyInterviewStageToggleLocal<
  T extends { id: string; isInterviewStage?: boolean },
>(stages: readonly T[], stageId: string, newValue: boolean): T[] {
  const targetId = String(stageId)
  return stages.map((stage) => {
    if (String(stage.id) === targetId) {
      return { ...stage, isInterviewStage: newValue }
    }
    if (newValue) return { ...stage, isInterviewStage: false }
    return stage
  })
}
