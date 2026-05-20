import type { AdminCalendarEvent } from "@/lib/api/admin-interviews-calendar"

export type CalendarViewMode = "day" | "week" | "month" | "year" | "agenda"

const pad2 = (n: number) => String(n).padStart(2, "0")

/** `YYYY-MM-DD` en fecha local. */
export function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

export function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

export function addMonths(d: Date, months: number): Date {
  const next = new Date(d)
  next.setMonth(next.getMonth() + months)
  return next
}

/** Lunes como primer día de semana (locale es). */
export function startOfLocalWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return startOfLocalDay(addDays(d, diff))
}

export function endOfLocalWeek(d: Date): Date {
  return endOfLocalDay(addDays(startOfLocalWeek(d), 6))
}

export function startOfLocalMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

export function endOfLocalMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function startOfLocalYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0)
}

export function endOfLocalYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
}

export function getMonthGridStart(anchor: Date): Date {
  const first = startOfLocalMonth(anchor)
  const dow = first.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  return addDays(first, diff)
}

export function getMonthGridDays(anchor: Date): Date[] {
  const start = getMonthGridStart(anchor)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfLocalWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function eventOverlapsLocalDay(event: AdminCalendarEvent, day: Date): boolean {
  const start = new Date(event.startUtc)
  const end = new Date(event.endUtc)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
  const dayStart = startOfLocalDay(day).getTime()
  const dayEnd = endOfLocalDay(day).getTime()
  return start.getTime() <= dayEnd && end.getTime() >= dayStart
}

export function filterEventsInLocalRange(
  events: AdminCalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): AdminCalendarEvent[] {
  const rs = rangeStart.getTime()
  const re = rangeEnd.getTime()
  return events.filter((ev) => {
    const start = new Date(ev.startUtc).getTime()
    const end = new Date(ev.endUtc).getTime()
    if (Number.isNaN(start) || Number.isNaN(end)) return false
    return start <= re && end >= rs
  })
}

export function groupEventsByLocalDateKey(
  events: AdminCalendarEvent[]
): Map<string, AdminCalendarEvent[]> {
  const map = new Map<string, AdminCalendarEvent[]>()
  events.forEach((ev) => {
    const start = new Date(ev.startUtc)
    const end = new Date(ev.endUtc)
    if (Number.isNaN(start.getTime())) return
    const endSafe = Number.isNaN(end.getTime()) ? start : end
    let cursor = startOfLocalDay(start)
    const last = startOfLocalDay(endSafe)
    while (cursor.getTime() <= last.getTime()) {
      const key = toLocalDateKey(cursor)
      const list = map.get(key) ?? []
      list.push(ev)
      map.set(key, list)
      cursor = addDays(cursor, 1)
    }
  })
  map.forEach((list, key) => {
    list.sort((a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime())
    map.set(key, list)
  })
  return map
}

export interface TimedLayoutEvent {
  event: AdminCalendarEvent
  column: number
  columnCount: number
  topMinutes: number
  heightMinutes: number
}

const DEFAULT_DAY_START_MIN = 7 * 60
const DEFAULT_DAY_END_MIN = 21 * 60

export function layoutTimedEventsForDay(
  events: AdminCalendarEvent[],
  day: Date,
  options?: { dayStartMinutes?: number; dayEndMinutes?: number }
): TimedLayoutEvent[] {
  const dayStartMin = options?.dayStartMinutes ?? DEFAULT_DAY_START_MIN
  const dayEndMin = options?.dayEndMinutes ?? DEFAULT_DAY_END_MIN
  const dayStartMs = startOfLocalDay(day).getTime()

  interface Slot {
    event: AdminCalendarEvent
    startMin: number
    endMin: number
  }

  const slots: Slot[] = []
  events.forEach((ev) => {
    const start = new Date(ev.startUtc)
    const end = new Date(ev.endUtc)
    if (Number.isNaN(start.getTime())) return
    const endMs = Number.isNaN(end.getTime())
      ? start.getTime() + (ev.durationMinutes ?? 60) * 60_000
      : end.getTime()
    let startMin = Math.floor((start.getTime() - dayStartMs) / 60_000)
    let endMin = Math.ceil((endMs - dayStartMs) / 60_000)
    startMin = Math.max(0, startMin)
    endMin = Math.max(startMin + 15, endMin)
    if (endMin <= dayStartMin || startMin >= dayEndMin) return
    startMin = Math.max(dayStartMin, startMin)
    endMin = Math.min(dayEndMin, endMin)
    slots.push({ event: ev, startMin, endMin })
  })

  slots.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  const layouts: TimedLayoutEvent[] = []
  let cluster: Slot[] = []
  let clusterEnd = 0

  const flushCluster = () => {
    if (cluster.length === 0) return
    const columns: Slot[][] = []
    cluster.forEach((slot) => {
      let placed = false
      for (let c = 0; c < columns.length; c++) {
        const last = columns[c][columns[c].length - 1]
        if (last.endMin <= slot.startMin) {
          columns[c].push(slot)
          placed = true
          break
        }
      }
      if (!placed) columns.push([slot])
    })
    const columnCount = Math.max(1, columns.length)
    columns.forEach((col, colIndex) => {
      col.forEach((slot) => {
        layouts.push({
          event: slot.event,
          column: colIndex,
          columnCount,
          topMinutes: slot.startMin - dayStartMin,
          heightMinutes: Math.max(20, slot.endMin - slot.startMin),
        })
      })
    })
    cluster = []
    clusterEnd = 0
  }

  slots.forEach((slot) => {
    if (cluster.length === 0) {
      cluster = [slot]
      clusterEnd = slot.endMin
      return
    }
    if (slot.startMin < clusterEnd) {
      cluster.push(slot)
      clusterEnd = Math.max(clusterEnd, slot.endMin)
      return
    }
    flushCluster()
    cluster = [slot]
    clusterEnd = slot.endMin
  })
  flushCluster()

  return layouts
}

export function getVisibleRangeForView(
  view: CalendarViewMode,
  anchor: Date
): { start: Date; end: Date } {
  switch (view) {
    case "day":
      return { start: startOfLocalDay(anchor), end: endOfLocalDay(anchor) }
    case "week":
      return { start: startOfLocalWeek(anchor), end: endOfLocalWeek(anchor) }
    case "month": {
      const gridStart = getMonthGridStart(anchor)
      const gridEnd = endOfLocalDay(addDays(gridStart, 41))
      return { start: gridStart, end: gridEnd }
    }
    case "year":
      return { start: startOfLocalYear(anchor), end: endOfLocalYear(anchor) }
    case "agenda":
    default:
      return { start: startOfLocalMonth(anchor), end: endOfLocalMonth(anchor) }
  }
}

export function formatCalendarRangeTitle(
  view: CalendarViewMode,
  anchor: Date
): string {
  const fmtMonthYear = new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  })
  const fmtDayMonth = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const fmtShort = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
  })

  switch (view) {
    case "day":
      return fmtDayMonth.format(anchor)
    case "week": {
      const start = startOfLocalWeek(anchor)
      const end = endOfLocalWeek(anchor)
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${fmtShort.format(start)} – ${end.getDate()} ${fmtMonthYear.format(start)}`
      }
      return `${fmtShort.format(start)} – ${fmtShort.format(end)} ${end.getFullYear()}`
    }
    case "month":
      return fmtMonthYear.format(anchor)
    case "year":
      return String(anchor.getFullYear())
    case "agenda":
    default:
      return fmtMonthYear.format(anchor)
  }
}

export function getBrowserTimeZoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local"
  } catch {
    return "local"
  }
}
