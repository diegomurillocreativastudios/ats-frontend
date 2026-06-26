"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import type { AdminCalendarEvent } from "@/lib/api/admin-interviews-calendar"
import {
  groupEventsByLocalDateKey,
  toLocalDateKey,
} from "@/lib/admin/interviews-calendar-layout"

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const

function heatClass(count: number): string {
  if (count <= 0) return "bg-muted/30"
  if (count === 1) return "bg-vo-sky/25"
  if (count <= 3) return "bg-vo-sky/45"
  if (count <= 6) return "bg-vo-purple/35"
  return "bg-vo-purple/55"
}

export interface ViewYearProps {
  anchorDate: Date
  events: AdminCalendarEvent[]
  onSelectDay: (day: Date) => void
}

export function ViewYear({ anchorDate, events, onSelectDay }: ViewYearProps) {
  const t = useTranslations("AdminPortal.interviews.calendar.year")
  const year = anchorDate.getFullYear()
  const byDay = useMemo(() => groupEventsByLocalDateKey(events), [events])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MONTH_KEYS.map((monthKey, monthIndex) => {
        const monthName = t(`months.${monthKey}`)
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
        const firstDow = new Date(year, monthIndex, 1).getDay()
        const offset = firstDow === 0 ? 6 : firstDow - 1
        const cells: (number | null)[] = []
        for (let i = 0; i < offset; i++) cells.push(null)
        for (let d = 1; d <= daysInMonth; d++) cells.push(d)
        while (cells.length % 7 !== 0) cells.push(null)

        return (
          <div
            key={monthKey}
            className="rounded-xl border border-border bg-card p-3"
          >
            <h3 className="mb-2 font-sans text-sm font-semibold text-foreground">
              {monthName} {year}
            </h3>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((dayNum, idx) => {
                if (dayNum == null) {
                  return <div key={`empty-${idx}`} className="h-4" />
                }
                const day = new Date(year, monthIndex, dayNum)
                const key = toLocalDateKey(day)
                const count = (byDay.get(key) ?? []).length
                return (
                  <button
                    key={key}
                    type="button"
                    title={t("dayTitle", { day: dayNum, count })}
                    onClick={() => onSelectDay(day)}
                    className={`h-4 w-full rounded-sm ${heatClass(count)} hover:ring-1 hover:ring-vo-purple`}
                    aria-label={t("dayAria", { day: dayNum, month: monthName, count })}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
