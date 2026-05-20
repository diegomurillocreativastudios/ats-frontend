"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  formatCalendarRangeTitle,
  getBrowserTimeZoneLabel,
  type CalendarViewMode,
} from "@/lib/admin/interviews-calendar-layout"

const VIEW_OPTIONS: { id: CalendarViewMode; label: string }[] = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "year", label: "Año" },
  { id: "agenda", label: "Agenda" },
]

export interface CalendarToolbarProps {
  view: CalendarViewMode
  anchorDate: Date
  onViewChange: (view: CalendarViewMode) => void
  onAnchorChange: (date: Date) => void
  onToday: () => void
  hideViewSwitcher?: boolean
}

export function CalendarToolbar({
  view,
  anchorDate,
  onViewChange,
  onAnchorChange,
  onToday,
  hideViewSwitcher = false,
}: CalendarToolbarProps) {
  const title = formatCalendarRangeTitle(view, anchorDate)
  const tz = getBrowserTimeZoneLabel()

  const handlePrev = () => {
    const d = new Date(anchorDate)
    if (view === "day") d.setDate(d.getDate() - 1)
    else if (view === "week") d.setDate(d.getDate() - 7)
    else if (view === "month" || view === "agenda") d.setMonth(d.getMonth() - 1)
    else if (view === "year") d.setFullYear(d.getFullYear() - 1)
    onAnchorChange(d)
  }

  const handleNext = () => {
    const d = new Date(anchorDate)
    if (view === "day") d.setDate(d.getDate() + 1)
    else if (view === "week") d.setDate(d.getDate() + 7)
    else if (view === "month" || view === "agenda") d.setMonth(d.getMonth() + 1)
    else if (view === "year") d.setFullYear(d.getFullYear() + 1)
    onAnchorChange(d)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple"
        >
          Hoy
        </button>
        <div className="flex items-center rounded-md border border-border">
          <button
            type="button"
            onClick={handlePrev}
            className="flex h-9 w-9 items-center justify-center text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple"
            aria-label="Periodo anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="flex h-9 w-9 items-center justify-center border-l border-border text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple"
            aria-label="Periodo siguiente"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <h2 className="min-w-0 font-sans text-lg font-semibold capitalize text-foreground">
          {title}
        </h2>
        <span className="rounded-md bg-muted px-2 py-1 font-sans text-xs text-muted-foreground">
          {tz}
        </span>
      </div>

      {hideViewSwitcher ? (
        <span className="font-sans text-xs text-muted-foreground">
          Vista agenda en móvil
        </span>
      ) : (
        <div
          className="inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-1"
          role="tablist"
          aria-label="Vista del calendario"
        >
          {VIEW_OPTIONS.map((opt) => {
            const isActive = view === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onViewChange(opt.id)}
                className={`rounded-md px-3 py-1.5 font-sans text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-vo-purple ${
                  isActive
                    ? "bg-vo-purple text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
