import { apiClient } from "@/lib/api"
import type {
  CalendarSyncResponse,
  GoogleCalendarStatus,
  GoogleOAuthResponse,
  InterviewCalendarEvent,
  CalendarSyncStatus,
} from "@/types/calendar"

/**
 * Rutas del backend ATS (recruiter) para integración Google Calendar.
 * Ajustar solo aquí si el contrato del API cambia.
 */
export const GOOGLE_CALENDAR_API = {
  // OAuth endpoints viven en RecruiterInterviewsController (Route: /api/recruiter)
  authorize: "/api/recruiter/interviews/auth/google/authorize",
  callback: "/api/recruiter/interviews/auth/google/callback",
  // Calendar endpoints viven en InterviewsCalendarController (Route: /api/interviews)
  status: "/api/interviews/calendar/status",
  disconnect: "/api/interviews/calendar/disconnect",
  sync: "/api/interviews/calendar/sync",
  interviewEvent: (interviewId: string) =>
    `/api/interviews/${encodeURIComponent(interviewId)}/calendar-event`,
} as const

function pickString(
  raw: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const k of keys) {
    const v = raw[k]
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function unwrapInterviewCalendarEventPayload(
  raw: unknown
): Record<string, unknown> | null {
  const direct = asRecord(raw)
  if (!direct) return null

  const nestedCandidates = [
    direct.event,
    direct.calendarEvent,
    direct.calendar_event,
    direct.data,
    direct.result,
  ]

  for (const candidate of nestedCandidates) {
    const nested = asRecord(candidate)
    if (!nested) continue
    const hasEventFields =
      pickString(nested, ["id", "eventId", "googleEventId", "google_event_id"]) !=
        null ||
      pickString(nested, [
        "googleCalendarUrl",
        "google_calendar_url",
        "htmlLink",
        "html_link",
      ]) != null
    if (hasEventFields) return nested
  }

  return direct
}

function normalizeSyncStatus(value: unknown): CalendarSyncStatus {
  const s = value != null ? String(value).toLowerCase().trim() : ""
  if (s === "synced" || s === "sincronizado") return "synced"
  if (s === "pending" || s === "pendiente") return "pending"
  if (s === "failed" || s === "error" || s === "fallido") return "failed"
  return "pending"
}

export function normalizeInterviewCalendarEvent(
  raw: unknown
): InterviewCalendarEvent | null {
  const r = unwrapInterviewCalendarEventPayload(raw)
  if (!r) return null
  const id =
    pickString(r, ["id", "eventId"]) ??
    pickString(r, ["googleEventId", "google_event_id"])
  if (!id) return null
  const interviewId =
    pickString(r, ["interviewId", "interview_id"]) ?? ""
  return {
    id,
    interviewId,
    googleEventId:
      pickString(r, ["googleEventId", "google_event_id"]) ?? "",
    googleCalendarId:
      pickString(r, ["googleCalendarId", "google_calendar_id"]) ?? "",
    syncStatus: normalizeSyncStatus(
      r.syncStatus ?? r.sync_status ?? r.status
    ),
    googleCalendarUrl:
      pickString(r, [
        "googleCalendarUrl",
        "google_calendar_url",
        "htmlLink",
        "html_link",
      ]) ?? "",
    createdAt: pickString(r, ["createdAt", "created_at"]) ?? "",
    updatedAt: pickString(r, ["updatedAt", "updated_at"]) ?? "",
  }
}

export async function getGoogleAuthUrl(): Promise<string> {
  const data = (await apiClient.post(GOOGLE_CALENDAR_API.authorize, {})) as {
    authUrl?: string
    auth_url?: string
  }
  const url = data.authUrl ?? data.auth_url
  if (!url || typeof url !== "string") {
    throw new Error("La respuesta del servidor no incluye authUrl")
  }
  return url
}

export async function checkCalendarStatus(): Promise<GoogleCalendarStatus> {
  const data = (await apiClient.get(GOOGLE_CALENDAR_API.status)) as Record<
    string,
    unknown
  >
  const connected =
    data.isConnected === true ||
    data.is_connected === true ||
    data.connected === true
  return {
    isConnected: Boolean(connected),
    email: pickString(data, ["email", "googleEmail", "google_email"]) ?? "",
    connectedAt:
      pickString(data, ["connectedAt", "connected_at"]) ?? null,
  }
}

export async function disconnectGoogleCalendar(): Promise<GoogleOAuthResponse> {
  try {
    const data = (await apiClient.post(
      GOOGLE_CALENDAR_API.disconnect,
      {}
    )) as GoogleOAuthResponse
    return data
  } catch (err: unknown) {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status?: number }).status)
        : 0
    if (status !== 404) throw err
    return (await apiClient.post(
      "/api/integrations/google-calendar/disconnect",
      {}
    )) as GoogleOAuthResponse
  }
}

export async function getInterviewCalendarEvent(
  interviewId: string
): Promise<InterviewCalendarEvent | null> {
  try {
    const raw = await apiClient.get(GOOGLE_CALENDAR_API.interviewEvent(interviewId))
    return normalizeInterviewCalendarEvent(raw)
  } catch (err: unknown) {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? (err as { status?: number }).status
        : 0
    if (status === 404) return null
    throw err
  }
}

export async function syncCalendarEvents(): Promise<CalendarSyncResponse> {
  return (await apiClient.post(GOOGLE_CALENDAR_API.sync, {})) as CalendarSyncResponse
}
