"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  ADMIN_TABLE_CLASS,
  ADMIN_TABLE_WRAP_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  ADMIN_THEAD_CLASS,
  ADMIN_TR_CLASS,
} from "@/components/portal-admin/admin-page-chrome"
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
          <div className={ADMIN_TABLE_WRAP_CLASS}>
            <table className={`${ADMIN_TABLE_CLASS} min-w-[720px]`}>
              <thead className={ADMIN_THEAD_CLASS}>
                <tr>
                  <th className={ADMIN_TH_CLASS}>{tAgenda("time")}</th>
                  <th className={ADMIN_TH_CLASS}>{tAgenda("candidate")}</th>
                  <th className={ADMIN_TH_CLASS}>{tAgenda("vacancy")}</th>
                  <th className={ADMIN_TH_CLASS}>{tAgenda("company")}</th>
                  <th className={ADMIN_TH_CLASS}>{tAgenda("recruiter")}</th>
                  <th className={ADMIN_TH_CLASS}>{tAgenda("type")}</th>
                  <th className={ADMIN_TH_CLASS}>{tAgenda("modality")}</th>
                  <th className={ADMIN_TH_CLASS}>{tAgenda("status")}</th>
                </tr>
              </thead>
              <tbody>
                {dayEvents.map((ev) => (
                  <tr
                    key={`${ev.id}-${dateKey}`}
                    className={`${ADMIN_TR_CLASS} cursor-pointer`}
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
                    <td className={`${ADMIN_TD_CLASS} whitespace-nowrap tabular-nums`}>
                      {formatInterviewLocalDateTime(ev.startUtc)}
                    </td>
                    <td className={`max-w-[160px] truncate ${ADMIN_TD_CLASS}`}>
                      {ev.candidate.name}
                    </td>
                    <td className={`max-w-[160px] truncate ${ADMIN_TD_CLASS}`}>
                      {ev.vacancy.title}
                    </td>
                    <td className={`max-w-[120px] truncate ${ADMIN_TD_CLASS} text-muted-foreground`}>
                      {ev.vacancy.companyName ?? dash}
                    </td>
                    <td className={`max-w-[140px] truncate ${ADMIN_TD_CLASS} text-muted-foreground`}>
                      {ev.recruiter.userName}
                    </td>
                    <td className={`${ADMIN_TD_CLASS} text-muted-foreground`}>
                      {ev.interviewType?.displayName ?? dash}
                    </td>
                    <td className={`${ADMIN_TD_CLASS} text-muted-foreground`}>
                      {ev.interviewModality?.displayName ?? dash}
                    </td>
                    <td className={ADMIN_TD_CLASS}>
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
