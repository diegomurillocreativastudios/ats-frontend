"use client"

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import {
  formatInterviewScheduleDateLabel,
  formatTimePickerLabel,
  getNearestQuarterHourClockNow,
  getQuarterHourTimeOptions,
  getTodayDateInputValue,
  isQuarterHourTime,
  parseFlexibleTimeInput,
} from "@/lib/interview-datetime"

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

const datePillButtonClass =
  "inline-flex min-h-10 min-w-[min(100%,13.5rem)] max-w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-center font-inter text-sm text-foreground transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-60"

const timeInputClass =
  "h-10 min-w-[9rem] max-w-[11rem] shrink-0 cursor-text rounded-md border border-input bg-background px-1.5 py-2 font-inter text-sm text-foreground outline-none transition-colors hover:bg-muted/30 focus:ring-2 focus:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-60"

export interface ScheduleDatePickerProps {
  value: string
  onChange: (nextYmd: string) => void
  disabled?: boolean
  placeholder?: string
  ariaLabel?: string
  errorMessage?: string | null
}

/**
 * Botón que abre un panel de calendario mensual (no el selector nativo del SO).
 */
export function ScheduleDatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Elegir fecha",
  ariaLabel = "Elegir fecha",
  errorMessage,
}: ScheduleDatePickerProps) {
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

  const monthTitle = useMemo(() => {
    const raw = viewMonth.toLocaleDateString("es-CL", {
      month: "long",
      year: "numeric",
    })
    if (!raw) return ""
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [viewMonth])

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
    : placeholder

  return (
    <div className="relative inline-flex max-w-full" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((o) => {
            const next = !o
            if (next) syncViewMonthForOpen()
            return next
          })
        }}
        className={datePillButtonClass}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? dialogId : undefined}
        aria-label={ariaLabel}
        data-invalid={errorMessage ? "true" : undefined}
      >
        <span className="select-none px-1">{displayLabel}</span>
      </button>

      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-label={ariaLabel}
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(100vw-1.5rem,18rem)] rounded-xl border border-border bg-background p-3 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span className="min-w-0 flex-1 text-center font-inter text-sm font-semibold text-foreground">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div
            className="mb-1 grid grid-cols-7 gap-0.5 text-center font-inter text-[10px] font-medium uppercase text-muted-foreground"
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
                  className={`flex h-9 w-full items-center justify-center rounded-md font-inter text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple ${
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

const BASE_QUARTER_OPTIONS = getQuarterHourTimeOptions()

function mergeTimeOptions(
  current: string
): { value: string; label: string }[] {
  if (!current) return BASE_QUARTER_OPTIONS
  if (isQuarterHourTime(current)) return BASE_QUARTER_OPTIONS
  return [
    { value: current, label: formatTimePickerLabel(current) },
    ...BASE_QUARTER_OPTIONS,
  ].sort((a, b) => a.value.localeCompare(b.value))
}

export interface QuarterHourTimeSelectProps {
  value: string
  onChange: (nextHhmm: string) => void
  disabled?: boolean
  ariaLabel: string
  allowEmpty?: boolean
  emptyLabel?: string
}

/**
 * Campo de hora con sugerencias cada 15 minutos (`datalist`) y texto libre
 * validado al salir del foco.
 */
export function QuarterHourTimeSelect({
  value,
  onChange,
  disabled = false,
  ariaLabel,
  allowEmpty = false,
  emptyLabel = "Hora",
}: QuarterHourTimeSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const options = useMemo(() => mergeTimeOptions(value), [value])
  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() =>
    value ? formatTimePickerLabel(value) : ""
  )
  const listboxRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!focused) {
      setText(value ? formatTimePickerLabel(value) : "")
    }
  }, [value, focused])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !listboxRef.current) return
    const anchor =
      value && options.some((o) => o.value === value)
        ? value
        : getNearestQuarterHourClockNow()
    const node = listboxRef.current.querySelector(
      `[data-time-value="${anchor}"]`
    )
    node?.scrollIntoView({ block: "center" })
  }, [open, value, options])

  const commitFromText = useCallback(() => {
    const parsed = parseFlexibleTimeInput(text)
    if (parsed === "") {
      if (allowEmpty) {
        onChange("")
        setText("")
        return
      }
      setText(value ? formatTimePickerLabel(value) : "")
      return
    }
    if (parsed === null) {
      setText(value ? formatTimePickerLabel(value) : "")
      return
    }
    onChange(parsed)
    setText(formatTimePickerLabel(parsed))
  }, [allowEmpty, onChange, text, value])

  const handleBlur = useCallback(() => {
    setFocused(false)
    commitFromText()
  }, [commitFromText])

  const handleChevronClick = useCallback(() => {
    if (disabled) return
    const input = inputRef.current
    if (!input) return
    input.focus()
    setOpen(true)
  }, [disabled])

  const handleSelectOption = useCallback(
    (nextTime: string) => {
      onChange(nextTime)
      setText(nextTime ? formatTimePickerLabel(nextTime) : "")
      setOpen(false)
      setFocused(false)
    },
    [onChange]
  )

  if (disabled && !value) {
    return (
      <div
        className={`${timeInputClass} pointer-events-none flex items-center justify-center text-muted-foreground`}
        aria-label={ariaLabel}
      >
        —
      </div>
    )
  }

  const displayValue = focused
    ? text
    : value
      ? formatTimePickerLabel(value)
      : ""

  return (
    <div className="relative inline-flex items-center" ref={rootRef}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        disabled={disabled}
        placeholder={allowEmpty ? emptyLabel : undefined}
        onFocus={() => {
          setFocused(true)
          setText(value ? formatTimePickerLabel(value) : "")
          setOpen(true)
        }}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
            return
          }
          if (e.key === "Escape") {
            setOpen(false)
          }
        }}
        className={`${timeInputClass} pr-6`}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleChevronClick}
        disabled={disabled}
        className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={`Abrir opciones de ${ariaLabel.toLowerCase()}`}
      >
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-42 overflow-hidden rounded-md border border-border bg-background shadow-lg">
          <ul
            ref={listboxRef}
            role="listbox"
            aria-label={`Opciones de ${ariaLabel.toLowerCase()}`}
            className="max-h-56 overflow-y-auto py-1"
          >
            {allowEmpty ? (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectOption("")}
                  className="w-full px-3 py-2 text-left font-inter text-sm text-muted-foreground transition-colors hover:bg-muted/70"
                >
                  {emptyLabel}
                </button>
              </li>
            ) : null}
            {options.map((option) => {
              const selected = option.value === value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    data-time-value={option.value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectOption(option.value)}
                    className={`w-full px-3 py-2 text-left font-inter text-sm tabular-nums transition-colors hover:bg-muted/70 ${
                      selected
                        ? "bg-vo-purple/10 font-medium text-vo-purple"
                        : "text-foreground"
                    }`}
                    role="option"
                    aria-selected={selected}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
