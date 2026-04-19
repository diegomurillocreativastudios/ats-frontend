export interface GoogleCalendarStatus {
  isConnected: boolean
  email: string
  connectedAt: string | null
}

export type CalendarSyncStatus = "synced" | "pending" | "failed"

export interface InterviewCalendarEvent {
  id: string
  interviewId: string
  googleEventId: string
  googleCalendarId: string
  syncStatus: CalendarSyncStatus
  googleCalendarUrl: string
  createdAt: string
  updatedAt: string
}

export interface GoogleOAuthResponse {
  success: boolean
  message: string
  error?: string
}

export interface CalendarSyncResponse {
  success: boolean
  syncedCount: number
  failedCount: number
  errors?: Array<{ interviewId: string; error: string }>
}
