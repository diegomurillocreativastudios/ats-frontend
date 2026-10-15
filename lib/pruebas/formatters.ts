import type {
  AssessmentKind,
  AssessmentLifecycleStatus,
  AssignmentStatus,
  ReviewStatus,
} from "@/lib/pruebas/types"

/**
 * Formats an ISO timestamp with the given locale. No product copy.
 * Uses UTC so server and client render the same string (avoids hydration drift).
 */
export function formatMockDate(
  iso: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
    ...options,
  }).format(date)
}

/** Duration as a bare minute count (callers add labels via i18n later). */
export function formatDurationMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return 0
  }
  return Math.floor(minutes)
}

export interface ScoreRatio {
  score: number
  maxScore: number
  ratio: number
}

/** Structured score ratio. Returns null when max is zero or inputs are invalid. */
export function formatScoreRatio(
  score: number | undefined,
  maxScore: number | undefined
): ScoreRatio | null {
  if (
    score === undefined ||
    maxScore === undefined ||
    !Number.isFinite(score) ||
    !Number.isFinite(maxScore) ||
    maxScore <= 0
  ) {
    return null
  }
  return {
    score,
    maxScore,
    ratio: score / maxScore,
  }
}

export type StatusCode =
  | AssessmentLifecycleStatus
  | AssignmentStatus
  | ReviewStatus
  | AssessmentKind

/** Pass-through identity helper for typed status codes in UI props. */
export function formatStatusCode(code: StatusCode): StatusCode {
  return code
}

export const ASSESSMENT_LIFECYCLE_STATUSES: readonly AssessmentLifecycleStatus[] =
  ["draft", "published", "archived"] as const

export const ASSIGNMENT_STATUSES: readonly AssignmentStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "expired",
  "cancelled",
] as const
