"use client"

import { useMemo } from "react"
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
  const grouped = useMemo(() => {
    const map = groupEventsByLocalDateKey(events)
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  if (grouped.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-12 text-center font-sans text-sm text-muted-foreground">
        No hay entrevistas en este rango con los filtros actuales.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(([dateKey, dayEvents]) => (
        <section key={dateKey} aria-label={`Agenda ${dateKey}`}>
          <h3 className="sticky top-0 z-10 border-b border-border bg-background/95 py-2 font-sans text-sm font-semibold text-foreground backdrop-blur">
            {formatInterviewScheduleDateLabel(dateKey) || dateKey}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[720px] border-collapse text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2 font-semibold">Hora</th>
                  <th className="px-4 py-2 font-semibold">Candidato</th>
                  <th className="px-4 py-2 font-semibold">Vacante</th>
                  <th className="px-4 py-2 font-semibold">Empresa</th>
                  <th className="px-4 py-2 font-semibold">Reclutador</th>
                  <th className="px-4 py-2 font-semibold">Tipo</th>
                  <th className="px-4 py-2 font-semibold">Modalidad</th>
                  <th className="px-4 py-2 font-semibold">Estado</th>
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
                      {ev.vacancy.companyName ?? "—"}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-2 text-muted-foreground">
                      {ev.recruiter.userName}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {ev.interviewType?.displayName ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {ev.interviewModality?.displayName ?? "—"}
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
