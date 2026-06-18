"use client"

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  formatInterviewScheduleDateLabel,
  getTodayDateInputValue,
} from "@/lib/interview-datetime"
import { useTranslations } from "next-intl"

const pad2 = (n: number) => String(n).padStart(2, "0")

function parseYmd(dateStr: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  const y = Number.parseInt(dateStr.slice(0, 4), 10)
  const mo = Number.parseInt(dateStr.slice(5, 7), 10)
  const d = Number.parseInt(dateStr.slice(8, 10), 10)
  const t = new Date(y, mo - 1, d)
  if (
    t.getFullYear() !== y ||
    t.getMonth() !== mo - 1 ||
    t.getDate() !== d
  ) {
    return null
  }
  return { y, m: mo - 1, d }
}

function toYmd(y: number, m0: number, d: number): string {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`
}

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const

const DEFAULT_YEAR_SPAN_PAST = 100
const DEFAULT_YEAR_SPAN_FUTURE = 10

const calendarSelectClass =
  "h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 font-sans text-xs font-semibold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-60"

const buildMonthOptions = (): { value: number; label: string }[] =>
  Array.from({ length: 12 }, (_, monthIndex) => {
    const raw = new Date(2000, monthIndex, 1).toLocaleDateString("es-CL", {
      month: "long",
    })
    const label = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : String(monthIndex + 1)
    return { value: monthIndex, label }
  })

const buildYearOptions = (minYear: number, maxYear: number): number[] => {
  const years: number[] = []
  for (let y = maxYear; y >= minYear; y--) years.push(y)
  return years
}

export const datePickerButtonClass =
  "inline-flex min-h-10 min-w-[min(100%,13.5rem)] max-w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-center font-sans text-sm text-foreground transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-60"

export const datePickerFilterButtonClass =
  "inline-flex h-10 w-full min-w-0 items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-center font-sans text-sm text-foreground transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-60"

export interface DatePickerProps {
  value: string
  onChange: (nextYmd: string) => void
  disabled?: boolean
  placeholder?: string
  ariaLabel?: string
  errorMessage?: string | null
  id?: string
  buttonClassName?: string
  wrapperClassName?: string
  /** Año mínimo en el desplegable (por defecto: hoy − 100). */
  minYear?: number
  /** Año máximo en el desplegable (por defecto: hoy + 10). */
  maxYear?: number
}

/**
 * Selector de fecha con calendario mensual (misma UI que entrevistas RRHH).
 */
export function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder,
  ariaLabel,
  errorMessage,
  id,
  buttonClassName = datePickerButtonClass,
  wrapperClassName = "relative inline-flex max-w-full",
  minYear: minYearProp,
  maxYear: maxYearProp,
}: DatePickerProps) {
  const t = useTranslations("Common")
  const resolvedPlaceholder = placeholder ?? t("pickDate")
  const resolvedAriaLabel = ariaLabel ?? t("pickDate")
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const dialogId = useId()

  const syncViewMonthForOpen = useCallback(() => {
    const p = value ? parseYmd(value) : null
    if (p) setViewMonth(new Date(p.y, p.m, 1))
    else {
      const n = new Date()
      setViewMonth(new Date(n.getFullYear(), n.getMonth(), 1))
    }
  }, [value])

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", handleMouseDown)
    window.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("pointerdown", handleMouseDown)
      window.removeEventListener("keydown", handleKey)
    }
  }, [open])

  const year = viewMonth.getFullYear()
  const monthIndex = viewMonth.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstJsDow = new Date(year, monthIndex, 1).getDay()
  const leading = (firstJsDow + 6) % 7
  const todayYmd = getTodayDateInputValue()

  const gridDays = useMemo(() => {
    const cells: { day: number; ymd: string }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, ymd: toYmd(year, monthIndex, d) })
    }
    return cells
  }, [year, monthIndex, daysInMonth])

  const todayYear = useMemo(() => new Date().getFullYear(), [])
  const minYear = minYearProp ?? todayYear - DEFAULT_YEAR_SPAN_PAST
  const maxYear = maxYearProp ?? todayYear + DEFAULT_YEAR_SPAN_FUTURE

  const monthOptions = useMemo(() => buildMonthOptions(), [])
  const yearOptions = useMemo(
    () => buildYearOptions(minYear, maxYear),
    [minYear, maxYear]
  )

  const handleMonthSelect = useCallback(
    (monthValue: number) => {
      setViewMonth(new Date(year, monthValue, 1))
    },
    [year]
  )

  const handleYearSelect = useCallback(
    (yearValue: number) => {
      setViewMonth(new Date(yearValue, monthIndex, 1))
    },
    [monthIndex]
  )

  const handlePrevMonth = useCallback(() => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }, [])

  const handleNextMonth = useCallback(() => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }, [])

  const handlePickDay = useCallback(
    (ymd: string) => {
      onChange(ymd)
      setOpen(false)
    },
    [onChange]
  )

  const displayLabel = value
    ? formatInterviewScheduleDateLabel(value)
    : resolvedPlaceholder

  return (
    <div className={wrapperClassName} ref={rootRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((o) => {
            const next = !o
            if (next) syncViewMonthForOpen()
            return next
          })
        }}
        className={buttonClassName}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? dialogId : undefined}
        aria-label={resolvedAriaLabel}
        data-invalid={errorMessage ? "true" : undefined}
      >
        <span className="select-none px-1">{displayLabel}</span>
      </button>

      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-label={resolvedAriaLabel}
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(100vw-1.5rem,20rem)] rounded-xl border border-border bg-background p-3 shadow-lg"
        >
          <div className="mb-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={year <= minYear && monthIndex <= 0}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("prevMonth")}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <select
              value={monthIndex}
              onChange={(e) => handleMonthSelect(Number(e.target.value))}
              className={calendarSelectClass}
              aria-label="Mes"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => handleYearSelect(Number(e.target.value))}
              className={`${calendarSelectClass} max-w-[5.5rem]`}
              aria-label="Año"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={year >= maxYear && monthIndex >= 11}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("nextMonth")}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div
            className="mb-1 grid grid-cols-7 gap-0.5 text-center font-sans text-[10px] font-medium uppercase text-muted-foreground"
            aria-hidden
          >
            {WEEKDAY_LABELS.map((l) => (
              <div key={l} className="py-1">
                {l}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leading }).map((_, i) => (
              <div key={`lead-${i}`} className="h-9" />
            ))}
            {gridDays.map(({ day, ymd }) => {
              const isSelected = value === ymd
              const isToday = ymd === todayYmd
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => handlePickDay(ymd)}
                  className={`flex h-9 w-full items-center justify-center rounded-md font-sans text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple ${
                    isSelected
                      ? "bg-vo-purple font-medium text-white"
                      : isToday
                        ? "bg-vo-purple/15 font-medium text-vo-purple"
                        : "text-foreground hover:bg-muted"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`Día ${day}`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated Usar `DatePicker`; alias para entrevistas RRHH. */
export const ScheduleDatePicker = DatePicker
export type ScheduleDatePickerProps = DatePickerProps
