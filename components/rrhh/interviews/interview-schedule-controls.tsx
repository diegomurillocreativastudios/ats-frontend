"use client"

import {
  addMinutesToClockTime,
  combineDatetimeLocal,
  getTodayDateInputValue,
  sameDayMinutesFromStartToEnd,
  splitDatetimeLocal,
} from "@/lib/interview-datetime"
import {
  QuarterHourTimeSelect,
  ScheduleDatePicker,
} from "@/components/rrhh/interviews/interview-schedule-pickers"

export interface InterviewScheduleRowProps {
  scheduledLocal: string
  onScheduledLocalChange: (value: string) => void
  durationMinutes: string
  onDurationMinutesChange: (value: string) => void
  disabled?: boolean
  ariaLabelledBy?: string
  errorMessage?: string | null
}

/**
 * Fila estilo calendario: fecha · hora inicio — hora fin (la duración se deriva del intervalo).
 */
export function InterviewScheduleRow({
  scheduledLocal,
  onScheduledLocalChange,
  durationMinutes,
  onDurationMinutesChange,
  disabled = false,
  ariaLabelledBy,
  errorMessage,
}: InterviewScheduleRowProps) {
  const { date, time: startTime } = splitDatetimeLocal(scheduledLocal)
  const durationParsed = parseInt(durationMinutes, 10)
  const hasExplicitDuration =
    durationMinutes.trim() !== "" &&
    Number.isFinite(durationParsed) &&
    durationParsed > 0
  const effectiveDurationMinutes = hasExplicitDuration ? durationParsed : 60
  const endTime = startTime
    ? addMinutesToClockTime(startTime, effectiveDurationMinutes)
    : ""

  const handleDateChange = (nextDate: string) => {
    if (!nextDate) {
      onScheduledLocalChange("")
      return
    }
    const t = startTime || "09:00"
    onScheduledLocalChange(combineDatetimeLocal(nextDate, t))
  }

  const handleStartChange = (nextStart: string) => {
    if (!nextStart) {
      onScheduledLocalChange("")
      return
    }
    const d = date || getTodayDateInputValue()
    onScheduledLocalChange(combineDatetimeLocal(d, nextStart))
  }

  const handleEndChange = (nextEnd: string) => {
    if (!nextEnd) return
    let st = startTime
    let d = date
    if (!st) {
      st = "09:00"
      d = d || getTodayDateInputValue()
      onScheduledLocalChange(combineDatetimeLocal(d, st))
    }
    const diff = sameDayMinutesFromStartToEnd(st, nextEnd)
    if (diff > 0) onDurationMinutesChange(String(diff))
  }

  return (
    <div
      role="group"
      className="flex flex-wrap items-center gap-2"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={errorMessage ? "err-when" : undefined}
    >
      <ScheduleDatePicker
        value={date}
        onChange={handleDateChange}
        disabled={disabled}
        ariaLabel="Fecha de la entrevista"
        errorMessage={errorMessage}
      />
      <QuarterHourTimeSelect
        value={startTime}
        onChange={handleStartChange}
        disabled={disabled}
        ariaLabel="Hora de inicio"
        allowEmpty
        emptyLabel="Inicio"
      />
      <span
        className="select-none font-sans text-sm text-muted-foreground"
        aria-hidden
      >
        —
      </span>
      <QuarterHourTimeSelect
        value={endTime}
        onChange={handleEndChange}
        disabled={disabled || !startTime}
        ariaLabel="Hora de fin"
      />
    </div>
  )
}

export interface InterviewSingleDatetimeRowProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabelledBy?: string
}

/**
 * Una fecha y hora en fila (p. ej. filtros "desde" / "hasta").
 */
export function InterviewSingleDatetimeRow({
  value,
  onChange,
  disabled = false,
  ariaLabelledBy,
}: InterviewSingleDatetimeRowProps) {
  const { date, time } = splitDatetimeLocal(value)

  const handleDateChange = (nextDate: string) => {
    if (!nextDate) {
      onChange("")
      return
    }
    const t = time || "00:00"
    onChange(combineDatetimeLocal(nextDate, t))
  }

  const handleTimeChange = (nextTime: string) => {
    if (!nextTime) {
      if (!date) {
        onChange("")
        return
      }
      onChange(combineDatetimeLocal(date, "00:00"))
      return
    }
    const d = date || getTodayDateInputValue()
    onChange(combineDatetimeLocal(d, nextTime))
  }

  return (
    <div
      role="group"
      className="flex flex-wrap items-center gap-2"
      aria-labelledby={ariaLabelledBy}
    >
      <ScheduleDatePicker
        value={date}
        onChange={handleDateChange}
        disabled={disabled}
        ariaLabel="Fecha"
      />
      <QuarterHourTimeSelect
        value={time}
        onChange={handleTimeChange}
        disabled={disabled}
        ariaLabel="Hora"
        allowEmpty
        emptyLabel="Hora"
      />
    </div>
  )
}
