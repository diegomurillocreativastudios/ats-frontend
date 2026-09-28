"use client"

import type { ReactNode } from "react"
import { Copy, ExternalLink, Video } from "lucide-react"
import { useTranslations } from "next-intl"
import { InterviewCalendarWidget } from "@/components/rrhh/interviews/interview-calendar-widget"

export interface InterviewSessionLinksProps {
  interviewId: string
  scheduledAtUtc: string
  googleMeetUrl: string | null
  meetHint: ReactNode
  onSync?: () => void
  compact?: boolean
  onCopyResult?: (ok: boolean) => void
}

const actionClass =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"

export function InterviewSessionLinks({
  interviewId,
  scheduledAtUtc,
  googleMeetUrl,
  meetHint,
  onSync,
  compact = false,
  onCopyResult,
}: InterviewSessionLinksProps) {
  const t = useTranslations("RecruiterPortal.interviews.detail")
  const meetUrl = googleMeetUrl?.trim() || null

  const handleCopyMeet = async () => {
    if (!meetUrl) return
    try {
      await navigator.clipboard.writeText(meetUrl)
      onCopyResult?.(true)
    } catch {
      onCopyResult?.(false)
    }
  }

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3.5"
          : "flex flex-col gap-3"
      }
    >
      {compact ? (
        <p className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("sessionLinks")}
        </p>
      ) : null}
      {meetUrl ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 font-sans text-sm font-medium text-foreground">
            <Video className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            {t("meetLink")}
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <a
              href={meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={actionClass}
            >
              {t("openMeet")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            <button
              type="button"
              onClick={() => void handleCopyMeet()}
              className={actionClass}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {t("copyMeet")}
            </button>
          </div>
        </div>
      ) : meetHint ? (
        <div className="font-sans text-sm text-foreground">{meetHint}</div>
      ) : null}
      <InterviewCalendarWidget
        interviewId={interviewId}
        scheduledAtUtc={scheduledAtUtc}
        onSync={onSync}
        compact={compact}
      />
    </div>
  )
}
