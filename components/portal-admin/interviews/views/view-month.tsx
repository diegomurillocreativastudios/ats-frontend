"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import type { AdminCalendarEvent } from "@/lib/api/admin-interviews-calendar"
import {
  eventOverlapsLocalDay,
  getMonthGridDays,
  groupEventsByLocalDateKey,
  toLocalDateKey,
} from "@/lib/admin/interviews-calendar-layout"
import { CalendarEventChip } from "@/components/portal-admin/interviews/calendar-event-chip"

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
const MAX_VISIBLE = 3

export interface ViewMonthProps {
  anchorDate: Date
  events: AdminCalendarEvent[]
  onSelectEvent: (event: AdminCalendarEvent) => void
  onDayClick?: (day: Date) => void
}

export function ViewMonth({
  anchorDate,
  events,
  onSelectEvent,
  onDayClick,
}: ViewMonthProps) {
  const t = useTranslations("AdminPortal.interviews.calendar.month")
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const days = useMemo(() => getMonthGridDays(anchorDate), [anchorDate])
  const byDay = useMemo(() => groupEventsByLocalDateKey(events), [events])
  const anchorMonth = anchorDate.getMonth()

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="grid min-w-[640px] grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAY_KEYS.map((key) => (
          <div
            key={key}
            className="px-2 py-2 text-center font-sans text-xs font-semibold text-muted-foreground"
          >
            {t(`weekdays.${key}`)}
          </div>
        ))}
      </div>
      <div className="grid min-w-[640px] grid-cols-7">
        {days.map((day) => {
          const key = toLocalDateKey(day)
          const dayEvents = (byDay.get(key) ?? []).filter((ev) =>
            eventOverlapsLocalDay(ev, day)
          )
          const isOtherMonth = day.getMonth() !== anchorMonth
          const isToday = toLocalDateKey(new Date()) === key
          const visible = dayEvents.slice(0, MAX_VISIBLE)
          const overflow = dayEvents.length - visible.length

          return (
            <div
              key={key}
              className={`relative min-h-[100px] border-b border-r border-border p-1 last:border-r-0 ${
                isOtherMonth ? "bg-muted/20" : "bg-card"
              }`}
            >
              <button
                type="button"
                onClick={() => onDayClick?.(day)}
                className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full font-sans text-xs font-medium ${
                  isToday
                    ? "bg-vo-purple text-white"
                    : "text-foreground hover:bg-muted"
                }`}
                aria-label={t("dayAria", { day: day.getDate() })}
              >
                {day.getDate()}
              </button>
              <div className="flex flex-col gap-0.5">
                {visible.map((ev) => (
                  <CalendarEventChip
                    key={`${ev.id}-${key}`}
                    event={ev}
                    compact
                    onClick={() => onSelectEvent(ev)}
                  />
                ))}
                {overflow > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedDay(expandedDay === key ? null : key)
                    }
                    className="rounded px-1 py-0.5 text-left font-sans text-[10px] font-medium text-vo-purple hover:underline"
                  >
                    {t("overflowMore", { count: overflow })}
                  </button>
                ) : null}
              </div>
              {expandedDay === key && overflow > 0 ? (
                <div className="absolute left-1 right-1 top-full z-20 mt-0.5 max-h-48 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg">
                  {dayEvents.slice(MAX_VISIBLE).map((ev) => (
                    <CalendarEventChip
                      key={`${ev.id}-more`}
                      event={ev}
                      compact
                      onClick={() => {
                        onSelectEvent(ev)
                        setExpandedDay(null)
                      }}
                      className="mb-0.5"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
