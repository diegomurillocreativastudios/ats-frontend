"use client"

import type { AdminCalendarEvent } from "@/lib/api/admin-interviews-calendar"

export interface CalendarKpisProps {
  events: AdminCalendarEvent[]
}

function KpiCard({
  label,
  value,
  accentClass,
}: {
  label: string
  value: number
  accentClass: string
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card px-4 py-3 ${accentClass}`}
    >
      <p className="font-sans text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-sans text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}

export function CalendarKpis({ events }: CalendarKpisProps) {
  const total = events.length
  const scheduled = events.filter((e) => e.status === "Scheduled").length
  const completed = events.filter((e) => e.status === "Completed").length
  const cancelled = events.filter((e) => e.status === "Cancelled").length

  return (
    <section
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      aria-label="Indicadores de entrevistas"
    >
      <KpiCard label="Total en rango" value={total} accentClass="" />
      <KpiCard
        label="Programadas"
        value={scheduled}
        accentClass="border-l-4 border-l-vo-sky"
      />
      <KpiCard
        label="Completadas"
        value={completed}
        accentClass="border-l-4 border-l-vo-navy"
      />
      <KpiCard
        label="Canceladas"
        value={cancelled}
        accentClass="border-l-4 border-l-vo-pink"
      />
    </section>
  )
}
