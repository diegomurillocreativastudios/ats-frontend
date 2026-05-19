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
import { flushSync } from "react-dom"
import { ChevronDown } from "lucide-react"
import {
  formatTimePickerLabel,
  getNearestQuarterHourClockNow,
  getQuarterHourTimeOptions,
  isQuarterHourTime,
  parseFlexibleTimeInput,
} from "@/lib/interview-datetime"
export {
  DatePicker as ScheduleDatePicker,
  type DatePickerProps as ScheduleDatePickerProps,
  datePickerButtonClass as datePillButtonClass,
} from "@/components/ui/date-picker"

const timeInputClass =
  "h-10 min-w-[9rem] max-w-[11rem] shrink-0 cursor-text rounded-md border border-input bg-background px-1.5 py-2 font-sans text-sm text-foreground outline-none transition-colors hover:bg-muted/30 focus:ring-2 focus:ring-vo-purple disabled:cursor-not-allowed disabled:opacity-60"


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
        flushSync(() => {
          onChange("")
        })
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
    flushSync(() => {
      onChange(parsed)
    })
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
      flushSync(() => {
        onChange(nextTime)
      })
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
                  className="w-full px-3 py-2 text-left font-sans text-sm text-muted-foreground transition-colors hover:bg-muted/70"
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
                    className={`w-full px-3 py-2 text-left font-sans text-sm tabular-nums transition-colors hover:bg-muted/70 ${
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
