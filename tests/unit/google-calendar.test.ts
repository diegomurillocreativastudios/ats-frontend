import { describe, expect, it } from "vitest"
import { normalizeInterviewCalendarEvent } from "@/lib/google-calendar"

describe("normalizeInterviewCalendarEvent", () => {
  it("normaliza evento directo cuando viene con id", () => {
    const event = normalizeInterviewCalendarEvent({
      id: "evt_1",
      interviewId: "int_1",
      googleEventId: "google_evt_1",
      googleCalendarId: "primary",
      syncStatus: "synced",
      googleCalendarUrl: "https://calendar.google.com/event?eid=abc",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    })

    expect(event).not.toBeNull()
    expect(event?.id).toBe("evt_1")
    expect(event?.syncStatus).toBe("synced")
  })

  it("normaliza evento anidado en calendarEvent", () => {
    const event = normalizeInterviewCalendarEvent({
      calendarEvent: {
        eventId: "evt_2",
        interview_id: "int_2",
        google_event_id: "google_evt_2",
        google_calendar_id: "primary",
        sync_status: "pending",
        google_calendar_url: "https://calendar.google.com/event?eid=def",
      },
    })

    expect(event).not.toBeNull()
    expect(event?.id).toBe("evt_2")
    expect(event?.interviewId).toBe("int_2")
    expect(event?.syncStatus).toBe("pending")
  })

  it("usa googleEventId como fallback cuando id no viene", () => {
    const event = normalizeInterviewCalendarEvent({
      event: {
        interviewId: "int_3",
        googleEventId: "google_evt_3",
        status: "synced",
        htmlLink: "https://calendar.google.com/event?eid=ghi",
      },
    })

    expect(event).not.toBeNull()
    expect(event?.id).toBe("google_evt_3")
    expect(event?.googleEventId).toBe("google_evt_3")
    expect(event?.googleCalendarUrl).toContain("calendar.google.com")
  })
})
