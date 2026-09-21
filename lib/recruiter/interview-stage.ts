/**
 * Identity of the unique Kanban interview stage is the `isInterviewStage` flag only.
 * Never match on persisted names such as "Interview" or "Entrevista".
 */

import {
  isHiredTerminalStage,
  isRejectionShortcutStage,
  resolveApplicationStage,
  sortApplicationStageCatalog,
  type ApplicationStageCatalogItem,
  type ApplicationStageRef,
} from "@/lib/recruiter/stage-move-validation"

export interface InterviewStageFlags {
  final?: boolean
  isHiredStage?: boolean
  isInterviewStage?: boolean
}

export type InterviewLeaveGateCode =
  | "ok"
  | "interview_not_done"
  | "interview_feedback_required"

export interface InterviewLeaveGateResult {
  allowed: boolean
  code: InterviewLeaveGateCode
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
  interviewDone?: boolean
  applicationId?: string | null
  readOnly?: boolean
}): boolean {
  if (params.readOnly) return false
  if (params.isInterviewStage !== true) return false
  if (params.interviewDone !== true) return false
  return String(params.applicationId ?? "").trim() !== ""
}

/**
 * Reads interviewDone from an applicant / application card payload.
 */
export function readInterviewDoneFromApplicant(
  match:
    | {
        interviewDone?: boolean | null
        interview_done?: boolean | null
        InterviewDone?: boolean | null
      }
    | null
    | undefined
): boolean {
  if (match == null) return false
  if (typeof match.interviewDone === "boolean") return match.interviewDone
  if (typeof match.interview_done === "boolean") return match.interview_done
  if (typeof match.InterviewDone === "boolean") return match.InterviewDone
  return false
}

/**
 * Reads hasInterviewFeedback from an applicant / application card payload.
 */
export function readHasInterviewFeedbackFromApplicant(
  match:
    | {
        hasInterviewFeedback?: boolean | null
        has_interview_feedback?: boolean | null
        HasInterviewFeedback?: boolean | null
      }
    | null
    | undefined
): boolean {
  if (match == null) return false
  if (typeof match.hasInterviewFeedback === "boolean") {
    return match.hasInterviewFeedback
  }
  if (typeof match.has_interview_feedback === "boolean") {
    return match.has_interview_feedback
  }
  if (typeof match.HasInterviewFeedback === "boolean") {
    return match.HasInterviewFeedback
  }
  return false
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
 * Gates leaving the interview stage forward. Entering interview or rejecting
 * stay unrestricted by interviewDone / feedback. Backward moves are blocked
 * earlier by pipeline geometry (`canMoveApplicationStage`).
 */
export function validateInterviewStageLeaveMove(params: {
  current: ApplicationStageRef
  target: ApplicationStageRef
  catalog: readonly ApplicationStageCatalogItem[]
  interviewDone?: boolean
  hasInterviewFeedback?: boolean
}): InterviewLeaveGateResult {
  const sorted = sortApplicationStageCatalog(params.catalog)
  const from = resolveApplicationStage(params.current, sorted)
  const to = resolveApplicationStage(params.target, sorted)

  if (!from || !to) return { allowed: true, code: "ok" }
  if (from.id === to.id) return { allowed: true, code: "ok" }

  if (isInterviewPipelineStage(to)) {
    return { allowed: true, code: "ok" }
  }

  if (!isInterviewPipelineStage(from)) {
    return { allowed: true, code: "ok" }
  }

  if (isRejectionShortcutStage(to)) {
    return { allowed: true, code: "ok" }
  }

  const fromIndex = sorted.findIndex((stage) => stage.id === from.id)
  const toIndex = sorted.findIndex((stage) => stage.id === to.id)
  if (fromIndex < 0 || toIndex < 0) return { allowed: true, code: "ok" }

  const isForwardNeighbor = toIndex === fromIndex + 1
  const isHiredForward = isHiredTerminalStage(to) && toIndex > fromIndex
  if (!isForwardNeighbor && !isHiredForward) {
    return { allowed: true, code: "ok" }
  }

  if (params.interviewDone !== true) {
    return { allowed: false, code: "interview_not_done" }
  }
  if (params.hasInterviewFeedback !== true) {
    return { allowed: false, code: "interview_feedback_required" }
  }
  return { allowed: true, code: "ok" }
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

/**
 * Optimistic catalog update: enabling interview-done on one status clears it on the rest.
 */
export function applyInterviewDoneToggleLocal<
  T extends { id: string; isInterviewDone?: boolean },
>(statuses: readonly T[], statusId: string, newValue: boolean): T[] {
  const targetId = String(statusId)
  return statuses.map((status) => {
    if (String(status.id) === targetId) {
      return { ...status, isInterviewDone: newValue }
    }
    if (newValue) return { ...status, isInterviewDone: false }
    return status
  })
}
