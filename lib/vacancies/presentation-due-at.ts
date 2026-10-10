/**
 * Suggests presentationDueAtUtc as end of UTC calendar day N days after `now`.
 * Matches backend calendar-UTC SLA (Headhunting 3 / Outsourcing 5).
 */
export function suggestPresentationDueAtUtc(
  slaDays: number,
  now: Date = new Date()
): string {
  const days = Math.floor(Number(slaDays))
  if (!Number.isFinite(days) || days < 1) {
    throw new Error("slaDays must be an integer >= 1")
  }

  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const day = now.getUTCDate()
  const due = new Date(Date.UTC(year, month, day + days, 23, 59, 59, 999))
  return due.toISOString()
}

/** Formats an ISO UTC instant for an HTML date input (yyyy-MM-dd in UTC). */
export function presentationDueAtUtcToDateInputValue(
  iso: string | null | undefined
): string {
  if (iso == null || String(iso).trim() === "") return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Converts an HTML date input value (yyyy-MM-dd) to presentationDueAtUtc ISO. */
export function dateInputValueToPresentationDueAtUtc(
  dateValue: string
): string | null {
  const trimmed = String(dateValue ?? "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const [y, m, d] = trimmed.split("-").map((part) => Number(part))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  const due = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
  if (Number.isNaN(due.getTime())) return null
  return due.toISOString()
}

export function isPresentationDueOverdue(
  iso: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (iso == null || String(iso).trim() === "") return false
  const due = new Date(iso)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() < now.getTime()
}

export function formatPresentationDueAtLabel(
  iso: string | null | undefined,
  locale = "es"
): string | null {
  if (iso == null || String(iso).trim() === "") return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(d)
}
