"use client"

import { useMemo } from "react"
import type { AdminCalendarEvent } from "@/lib/api/admin-interviews-calendar"
import {
  eventOverlapsLocalDay,
  getWeekDays,
  layoutTimedEventsForDay,
  toLocalDateKey,
} from "@/lib/admin/interviews-calendar-layout"
import { CalendarEventChip } from "@/components/portal-admin/interviews/calendar-event-chip"

const PX_PER_MIN = 1.1
const DAY_START = 7 * 60
const DAY_END = 21 * 60
const TOTAL_MIN = DAY_END - DAY_START

function formatHourLabel(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60)
  return `${String(h).padStart(2, "0")}:00`
}

export interface ViewWeekProps {
  anchorDate: Date
  events: AdminCalendarEvent[]
  onSelectEvent: (event: AdminCalendarEvent) => void
}

export function ViewWeek({ anchorDate, events, onSelectEvent }: ViewWeekProps) {
  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate])
  const hourMarks = useMemo(() => {
    const marks: number[] = []
    for (let m = DAY_START; m <= DAY_END; m += 60) marks.push(m)
    return marks
  }, [])

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="grid min-w-[720px] grid-cols-[3.5rem_repeat(7,1fr)] border-b border-border">
        <div />
        {weekDays.map((day) => {
          const isToday = toLocalDateKey(new Date()) === toLocalDateKey(day)
          return (
            <div
              key={toLocalDateKey(day)}
              className={`border-l border-border px-2 py-2 text-center font-sans text-xs font-semibold ${
                isToday ? "text-vo-purple" : "text-foreground"
              }`}
            >
              {day.toLocaleDateString("es", { weekday: "short", day: "numeric" })}
            </div>
          )
        })}
      </div>
      <div
        className="grid min-w-[720px] grid-cols-[3.5rem_repeat(7,1fr)]"
        style={{ height: TOTAL_MIN * PX_PER_MIN }}
      >
        <div className="relative border-r border-border">
          {hourMarks.map((m) => (
            <div
              key={m}
              className="absolute right-1 -translate-y-1/2 font-sans text-[10px] text-muted-foreground"
              style={{ top: (m - DAY_START) * PX_PER_MIN }}
            >
              {formatHourLabel(m)}
            </div>
          ))}
        </div>
        {weekDays.map((day) => {
          const dayEvents = events.filter((ev) => eventOverlapsLocalDay(ev, day))
          const layouts = layoutTimedEventsForDay(dayEvents, day, {
            dayStartMinutes: DAY_START,
            dayEndMinutes: DAY_END,
          })
          return (
            <div
              key={toLocalDateKey(day)}
              className="relative border-l border-border"
            >
              {hourMarks.map((m) => (
                <div
                  key={m}
                  className="absolute left-0 right-0 border-t border-border/60"
                  style={{ top: (m - DAY_START) * PX_PER_MIN }}
                />
              ))}
              {layouts.map((layout) => {
                const widthPct = 100 / layout.columnCount
                const leftPct = layout.column * widthPct
                return (
                  <div
                    key={`${layout.event.id}-${layout.column}`}
                    className="absolute z-10 overflow-hidden px-0.5"
                    style={{
                      top: layout.topMinutes * PX_PER_MIN,
                      height: layout.heightMinutes * PX_PER_MIN,
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  >
                    <CalendarEventChip
                      event={layout.event}
                      compact
                      onClick={() => onSelectEvent(layout.event)}
                      className="h-full"
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
