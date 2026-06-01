/**
 * Utilidades de fecha / zona horaria (Google Calendar + formularios).
 */

export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function formatDateForInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ""
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function formatTimeForInput(time: string | null): string {
  if (!time) return "09:00"
  return time.length === 5 ? time : time.substring(0, 5)
}

export function isValidFutureDate(dateString: string): boolean {
  const date = new Date(`${dateString}T12:00:00`)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date >= today
}

export function toISODateTime(date: string, time: string): string {
  return `${date}T${time}:00`
}

export function getMinutesBetween(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number)
  const [endH, endM] = endTime.split(":").map(Number)
  if (
    [startH, startM, endH, endM].some(
      (n) => typeof n !== "number" || Number.isNaN(n)
    )
  ) {
    return 0
  }
  return endH * 60 + endM - (startH * 60 + startM)
}
