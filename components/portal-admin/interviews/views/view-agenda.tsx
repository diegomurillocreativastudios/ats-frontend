"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import type { AdminCalendarEvent } from "@/lib/api/admin-interviews-calendar"
import { groupEventsByLocalDateKey } from "@/lib/admin/interviews-calendar-layout"
import {
  formatInterviewLocalDateTime,
  formatInterviewScheduleDateLabel,
} from "@/lib/interview-datetime"
import { InterviewStatusBadge } from "@/components/rrhh/interviews/interview-status-badge"

export interface ViewAgendaProps {
  events: AdminCalendarEvent[]
  onSelectEvent: (event: AdminCalendarEvent) => void
}

export function ViewAgenda({ events, onSelectEvent }: ViewAgendaProps) {
  const t = useTranslations("AdminPortal.interviews.calendar")
  const tAgenda = useTranslations("AdminPortal.interviews.calendar.agenda")
  const dash = t("eventDetail.dash")

  const grouped = useMemo(() => {
    const map = groupEventsByLocalDateKey(events)
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  if (grouped.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-12 text-center font-sans text-sm text-muted-foreground">
        {t("emptyStates.noEvents")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(([dateKey, dayEvents]) => (
        <section key={dateKey} aria-label={tAgenda("aria", { dateKey })}>
          <h3 className="sticky top-0 z-10 border-b border-border bg-background/95 py-2 font-sans text-sm font-semibold text-foreground backdrop-blur">
            {formatInterviewScheduleDateLabel(dateKey) || dateKey}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[720px] border-collapse text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2 font-semibold">{tAgenda("time")}</th>
                  <th className="px-4 py-2 font-semibold">{tAgenda("candidate")}</th>
                  <th className="px-4 py-2 font-semibold">{tAgenda("vacancy")}</th>
                  <th className="px-4 py-2 font-semibold">{tAgenda("company")}</th>
                  <th className="px-4 py-2 font-semibold">{tAgenda("recruiter")}</th>
                  <th className="px-4 py-2 font-semibold">{tAgenda("type")}</th>
                  <th className="px-4 py-2 font-semibold">{tAgenda("modality")}</th>
                  <th className="px-4 py-2 font-semibold">{tAgenda("status")}</th>
                </tr>
              </thead>
              <tbody>
                {dayEvents.map((ev) => (
                  <tr
                    key={`${ev.id}-${dateKey}`}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30"
                    onClick={() => onSelectEvent(ev)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onSelectEvent(ev)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums">
                      {formatInterviewLocalDateTime(ev.startUtc)}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-2">
                      {ev.candidate.name}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-2">
                      {ev.vacancy.title}
                    </td>
                    <td className="max-w-[120px] truncate px-4 py-2 text-muted-foreground">
                      {ev.vacancy.companyName ?? dash}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-2 text-muted-foreground">
                      {ev.recruiter.userName}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {ev.interviewType?.displayName ?? dash}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {ev.interviewModality?.displayName ?? dash}
                    </td>
                    <td className="px-4 py-2">
                      <InterviewStatusBadge
                        status={ev.status}
                        label={ev.statusDisplayName}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
