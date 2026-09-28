import { describe, it, expect } from "vitest"
import {
  addMinutesToClockTime,
  clampDurationMinutesToSameDay,
  combineDatetimeLocal,
  formatInterviewScheduleDateLabel,
  getCeilingQuarterHourClockNow,
  getMinEndClockAfterStart,
  getMinStartClockForDate,
  isClockTimeBefore,
  isLocalDatetimeInPast,
  isQuarterHourTime,
  maxSameDayDurationMinutes,
  normalizeClockTimeInput,
  parseFlexibleTimeInput,
  sameDayMinutesFromStartToEnd,
  splitDatetimeLocal,
} from "@/lib/interview-datetime"

describe("interview-datetime helpers", () => {
  it("splitDatetimeLocal y combineDatetimeLocal son inversos", () => {
    const s = "2026-04-16T09:30"
    const { date, time } = splitDatetimeLocal(s)
    expect(date).toBe("2026-04-16")
    expect(time).toBe("09:30")
    expect(combineDatetimeLocal(date, time)).toBe(s)
  })

  it("addMinutesToClockTime suma dentro del día", () => {
    expect(addMinutesToClockTime("09:00", 60)).toBe("10:00")
    expect(addMinutesToClockTime("23:30", 60)).toBe("00:30")
  })

  it("sameDayMinutesFromStartToEnd solo cuenta fin posterior el mismo día", () => {
    expect(sameDayMinutesFromStartToEnd("09:00", "10:00")).toBe(60)
    expect(sameDayMinutesFromStartToEnd("23:00", "01:00")).toBe(0)
    expect(sameDayMinutesFromStartToEnd("22:15", "22:15")).toBe(0)
    expect(sameDayMinutesFromStartToEnd("22:15", "23:00")).toBe(45)
  })

  it("getMinEndClockAfterStart es el siguiente cuarto", () => {
    expect(getMinEndClockAfterStart("22:15")).toBe("22:30")
    expect(getMinEndClockAfterStart("23:30")).toBe("23:45")
    expect(getMinEndClockAfterStart("23:45")).toBeNull()
  })

  it("clampDurationMinutesToSameDay evita envolver medianoche", () => {
    expect(maxSameDayDurationMinutes("23:00")).toBe(45)
    expect(clampDurationMinutesToSameDay("23:00", 60)).toBe(45)
    expect(clampDurationMinutesToSameDay("09:00", 60)).toBe(60)
  })

  it("isQuarterHourTime detecta cuartos de hora", () => {
    expect(isQuarterHourTime("10:15")).toBe(true)
    expect(isQuarterHourTime("10:07")).toBe(false)
  })

  it("normalizeClockTimeInput normaliza o rechaza", () => {
    expect(normalizeClockTimeInput("  ")).toBe("")
    expect(normalizeClockTimeInput("9:5")).toBe("09:05")
    expect(normalizeClockTimeInput("14:30")).toBe("14:30")
    expect(normalizeClockTimeInput("7")).toBe("07:00")
    expect(normalizeClockTimeInput("25:00")).toBe(null)
    expect(normalizeClockTimeInput("12:60")).toBe(null)
    expect(normalizeClockTimeInput("no")).toBe(null)
    expect(normalizeClockTimeInput("2:00 p. m.")).toBe(null)
  })

  it("formatInterviewScheduleDateLabel incluye día, mes y año", () => {
    expect(formatInterviewScheduleDateLabel("2026-05-19")).toBe(
      "Martes, 19 de mayo del 2026"
    )
  })

  it("parseFlexibleTimeInput no interpreta 12 h como 24 h", () => {
    expect(parseFlexibleTimeInput("2:00 p. m.")).toBe("14:00")
    expect(parseFlexibleTimeInput("2:00 a. m.")).toBe("02:00")
    expect(parseFlexibleTimeInput("12:00 p. m.")).toBe("12:00")
    expect(parseFlexibleTimeInput("12:00 a. m.")).toBe("00:00")
  })

  it("isClockTimeBefore compara HH:mm", () => {
    expect(isClockTimeBefore("09:00", "09:15")).toBe(true)
    expect(isClockTimeBefore("09:15", "09:15")).toBe(false)
    expect(isClockTimeBefore("10:00", "09:45")).toBe(false)
  })

  it("getCeilingQuarterHourClockNow redondea hacia arriba al siguiente cuarto", () => {
    expect(getCeilingQuarterHourClockNow(new Date(2026, 8, 25, 21, 27, 0))).toBe(
      "21:30"
    )
    expect(getCeilingQuarterHourClockNow(new Date(2026, 8, 25, 21, 15, 0))).toBe(
      "21:15"
    )
    expect(getCeilingQuarterHourClockNow(new Date(2026, 8, 25, 21, 15, 1))).toBe(
      "21:30"
    )
    expect(getCeilingQuarterHourClockNow(new Date(2026, 8, 25, 23, 50, 0))).toBe(
      null
    )
  })

  it("isLocalDatetimeInPast detecta instantes anteriores a now", () => {
    const now = new Date(2026, 8, 25, 21, 30, 0)
    expect(isLocalDatetimeInPast("2026-09-25T21:15", now)).toBe(true)
    expect(isLocalDatetimeInPast("2026-09-25T21:30", now)).toBe(false)
    expect(isLocalDatetimeInPast("2026-09-26T08:00", now)).toBe(false)
  })

  it("getMinStartClockForDate solo restringe el día de hoy", () => {
    const now = new Date(2026, 8, 25, 21, 27, 0)
    expect(getMinStartClockForDate("2026-09-26", now)).toBeUndefined()
    expect(getMinStartClockForDate("2026-09-25", now)).toBe("21:30")
    expect(getMinStartClockForDate("2026-09-24", now)).toBeNull()
  })
})
