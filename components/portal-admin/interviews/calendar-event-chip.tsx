"use client"

import { Building2, MapPin, Video } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { AdminCalendarEvent } from "@/lib/api/admin-interviews-calendar"
import type { InterviewStatus } from "@/lib/api/interviews"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"

const STATUS_BORDER: Record<InterviewStatus, string> = {
  Scheduled: "border-l-vo-sky",
  Completed: "border-l-vo-navy",
  Cancelled: "border-l-vo-pink",
  NoShow: "border-l-vo-yellow",
}

const STATUS_BG: Record<InterviewStatus, string> = {
  Scheduled: "bg-vo-sky/10 hover:bg-vo-sky/20",
  Completed: "bg-vo-navy/10 hover:bg-vo-navy/20",
  Cancelled: "bg-vo-pink/10 hover:bg-vo-pink/20",
  NoShow: "bg-vo-yellow/15 hover:bg-vo-yellow/25",
}

function formatChipTime(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
}

function ModalityIcon({ event }: { event: AdminCalendarEvent }) {
  const modality = event.interviewModality?.displayName?.toLowerCase() ?? ""
  const hasMeet =
    Boolean(event.googleMeetUrl?.trim()) ||
    event.interviewModality?.includeGoogleMeetLink
  if (hasMeet || modality.includes("virtual") || modality.includes("remot")) {
    return <Video className="h-3 w-3 shrink-0 text-vo-purple" aria-hidden />
  }
  if (modality.includes("presencial") || modality.includes("oficina")) {
    return <Building2 className="h-3 w-3 shrink-0 text-vo-navy" aria-hidden />
  }
  return <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
}

export interface CalendarEventChipProps {
  event: AdminCalendarEvent
  compact?: boolean
  onClick?: () => void
  className?: string
}

export function CalendarEventChip({
  event,
  compact = false,
  onClick,
  className = "",
}: CalendarEventChipProps) {
  const t = useTranslations("AdminPortal.interviews.calendar.eventChip")
  const locale = useLocale()
  const time = formatChipTime(event.startUtc, locale)
  const subtitle = [event.vacancy.companyName, event.recruiter.userName]
    .filter(Boolean)
    .join(" · ")

  const ariaLabel = [
    t("interview"),
    time,
    t("with"),
    event.candidate.name,
    t("for"),
    event.vacancy.title,
    event.statusDisplayName ?? event.status,
  ].join(" ")

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-w-0 rounded-md border border-border border-l-4 px-2 py-1 text-left font-sans transition-colors ${STATUS_BORDER[event.status]} ${STATUS_BG[event.status]} ${className}`}
      aria-label={ariaLabel}
      data-testid={`calendar-event-${event.id}`}
    >
      <div className="flex min-w-0 items-start gap-1">
        <ModalityIcon event={event} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {time}
            {!compact ? ` · ${event.candidate.name}` : ""}
          </p>
          {compact ? (
            <p className="truncate text-[11px] text-muted-foreground">
              {event.candidate.name}
            </p>
          ) : null}
          <p className="truncate text-[11px] text-muted-foreground">
            {event.vacancy.title}
          </p>
          {!compact && subtitle ? (
            <p className="truncate text-[10px] text-muted-foreground/80">
              {subtitle}
            </p>
          ) : null}
        </div>
        {!compact ? (
          <InterviewStatusBadge
            status={event.status}
            label={event.statusDisplayName}
            className="shrink-0 scale-90"
          />
        ) : null}
      </div>
    </button>
  )
}
