import { describe, it, expect } from "vitest"
import {
  addMinutesToClockTime,
  combineDatetimeLocal,
  isQuarterHourTime,
  normalizeClockTimeInput,
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

  it("sameDayMinutesFromStartToEnd cruza medianoche si hace falta", () => {
    expect(sameDayMinutesFromStartToEnd("09:00", "10:00")).toBe(60)
    expect(sameDayMinutesFromStartToEnd("23:00", "01:00")).toBe(120)
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
  })
})
