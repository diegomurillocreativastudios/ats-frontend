import type { AssessmentLifecycleStatus } from "@/lib/pruebas/types"

export interface AssessmentStatusBadgeProps {
  lifecycleStatus: AssessmentLifecycleStatus
  label: string
}

const STATUS_STYLES: Record<AssessmentLifecycleStatus, string> = {
  draft: "border-border bg-muted text-foreground",
  published: "border-vo-purple/40 bg-vo-purple/10 text-emerald-900",
  archived: "border-amber-300 bg-amber-50 text-amber-800",
}

/**
 * Lifecycle badge for assessment definitions only (draft / published / archived).
 * Assignment statuses must never be passed here.
 */
export function AssessmentStatusBadge({
  lifecycleStatus,
  label,
}: AssessmentStatusBadgeProps) {
  return (
    <span
      data-status={lifecycleStatus}
      data-testid="assessment-status-badge"
      className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 font-sans text-xs font-medium ${STATUS_STYLES[lifecycleStatus]}`}
    >
      {label}
    </span>
  )
}

export const ASSESSMENT_STATUS_BADGE_STATUSES: readonly AssessmentLifecycleStatus[] =
  ["draft", "published", "archived"] as const
