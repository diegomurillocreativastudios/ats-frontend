/**
 * Respuesta de GET /api/candidate/dashboard (backend .NET serializa en camelCase).
 */

export interface CandidatePortalStats {
  activeApplications: number
  pendingEvaluations: number
  upcomingInterviews: number
  unreadMessages: number
}

export interface CandidatePortalApplicationRow {
  id: string
  jobTitle: string
  companyLine: string
  statusLabel: string
  progressCurrent: number
  totalStages: number
}

export interface CandidatePortalActivity {
  id: string
  kind: string
  title: string
  detailLine: string
  statusLabel: string
  statusTone: string
}

export interface CandidatePortalDashboard {
  greetingName: string | null
  stats: CandidatePortalStats
  applications: CandidatePortalApplicationRow[]
  activities: CandidatePortalActivity[]
}
