"use client"

import { useMemo } from "react"
import type { AdminCalendarEvent } from "@/lib/api/admin-interviews-calendar"
import {
  eventOverlapsLocalDay,
  layoutTimedEventsForDay,
} from "@/lib/admin/interviews-calendar-layout"
import { CalendarEventChip } from "@/components/portal-admin/interviews/calendar-event-chip"

const PX_PER_MIN = 1.2
const DAY_START = 0
const DAY_END = 24 * 60
const TOTAL_MIN = DAY_END - DAY_START

function formatHourLabel(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60)
  return `${String(h).padStart(2, "0")}:00`
}

export interface ViewDayProps {
  anchorDate: Date
  events: AdminCalendarEvent[]
  onSelectEvent: (event: AdminCalendarEvent) => void
}

export function ViewDay({ anchorDate, events, onSelectEvent }: ViewDayProps) {
  const dayEvents = useMemo(
    () => events.filter((ev) => eventOverlapsLocalDay(ev, anchorDate)),
    [events, anchorDate]
  )
  const layouts = useMemo(
    () =>
      layoutTimedEventsForDay(dayEvents, anchorDate, {
        dayStartMinutes: DAY_START,
        dayEndMinutes: DAY_END,
      }),
    [dayEvents, anchorDate]
  )

  const hourMarks = useMemo(() => {
    const marks: number[] = []
    for (let m = 0; m <= DAY_END; m += 60) marks.push(m)
    return marks
  }, [])

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div
        className="grid min-w-[320px] grid-cols-[3.5rem_1fr]"
        style={{ height: TOTAL_MIN * PX_PER_MIN }}
      >
        <div className="relative border-r border-border">
          {hourMarks.map((m) => (
            <div
              key={m}
              className="absolute right-1 -translate-y-1/2 font-sans text-[10px] text-muted-foreground"
              style={{ top: m * PX_PER_MIN }}
            >
              {formatHourLabel(m)}
            </div>
          ))}
        </div>
        <div className="relative">
          {hourMarks.map((m) => (
            <div
              key={m}
              className="absolute left-0 right-0 border-t border-border/60"
              style={{ top: m * PX_PER_MIN }}
            />
          ))}
          {layouts.map((layout) => {
            const widthPct = 100 / layout.columnCount
            const leftPct = layout.column * widthPct
            return (
              <div
                key={`${layout.event.id}-${layout.column}`}
                className="absolute z-10 overflow-hidden px-1"
                style={{
                  top: layout.topMinutes * PX_PER_MIN,
                  height: layout.heightMinutes * PX_PER_MIN,
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                }}
              >
                <CalendarEventChip
                  event={layout.event}
                  onClick={() => onSelectEvent(layout.event)}
                  className="h-full"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
