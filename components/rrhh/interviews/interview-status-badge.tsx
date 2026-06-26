import { useTranslations } from "next-intl"
import type { InterviewStatus } from "@/lib/api/interviews"
import { getInterviewStatusLabel } from "@/lib/interviews/interview-status-labels"

const STATUS_STYLES: Record<InterviewStatus, { className: string }> = {
  Scheduled: {
    className: "border border-ats-arena bg-ats-arena/60 text-gray-700",
  },
  Completed: {
    className: "border border-vo-navy/40 bg-vo-navy/10 text-vo-navy",
  },
  Cancelled: {
    className: "border border-vo-pink/40 bg-vo-pink/10 text-vo-pink",
  },
  NoShow: {
    className:
      "border border-vo-yellow/50 bg-vo-yellow/15 text-vo-yellow-foreground",
  },
}

export interface InterviewStatusBadgeProps {
  status: InterviewStatus
  /** Si viene del API (displayName), sustituye la etiqueta fija del enum. */
  label?: string | null
  className?: string
}

export function InterviewStatusBadge({
  status,
  label = null,
  className = "",
}: InterviewStatusBadgeProps) {
  const t = useTranslations("RecruiterPortal.interviews")
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.Scheduled
  const text =
    typeof label === "string" && label.trim() !== ""
      ? label.trim()
      : getInterviewStatusLabel(status, t)
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-medium ${config.className} ${className}`}
      data-testid="interview-status-badge"
      data-status={status}
    >
      {text}
    </span>
  )
}
