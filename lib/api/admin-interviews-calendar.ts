import { apiClient } from "@/lib/api"
import {
  getInterviewHttpErrorMessage,
  normalizeInterview,
  type InterviewStatus,
} from "@/lib/api/interviews"
import { listAllRecruiterVacancies } from "@/lib/api/recruiter-vacancies"

export interface AdminCalendarCandidate {
  profileId: string
  name: string
  email: string | null
}

export interface AdminCalendarVacancy {
  id: string
  title: string
  companyId: string | null
  companyName: string | null
}

export interface AdminCalendarRecruiter {
  userId: string
  userName: string
  email: string | null
}

export interface AdminCalendarTypeRef {
  id: string | null
  displayName: string | null
}

export interface AdminCalendarModalityRef {
  id: string | null
  displayName: string | null
  includeGoogleMeetLink: boolean
}

export interface AdminCalendarEvent {
  id: string
  startUtc: string
  endUtc: string
  durationMinutes: number | null
  status: InterviewStatus
  statusDisplayName: string | null
  interviewStatusId: string | null
  candidate: AdminCalendarCandidate
  vacancy: AdminCalendarVacancy
  recruiter: AdminCalendarRecruiter
  interviewType: AdminCalendarTypeRef | null
  interviewModality: AdminCalendarModalityRef | null
  interviewerName: string | null
  googleMeetUrl: string | null
  googleCalendarEventId: string | null
}

export interface AdminCalendarQuery {
  fromUtc?: string
  toUtc?: string
  vacancyId?: string
  recruiterUserId?: string
  interviewStatusId?: string
  companyId?: string
  includeCancelled?: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickString(raw: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = raw[k]
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return null
}

function pickNumber(raw: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number.parseInt(v, 10)
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

function pickBool(raw: Record<string, unknown>, keys: string[], defaultValue = false): boolean {
  for (const k of keys) {
    if (!(k in raw)) continue
    const v = raw[k]
    if (typeof v === "boolean") return v
    if (v === "true" || v === 1 || v === "1") return true
    if (v === "false" || v === 0 || v === "0") return false
  }
  return defaultValue
}

function mapNestedPerson(
  raw: unknown,
  idKeys: string[],
  nameKeys: string[],
  emailKeys: string[]
): { id: string; name: string; email: string | null } {
  const o = asRecord(raw) ?? {}
  const id = pickString(o, idKeys) ?? ""
  const name =
    pickString(o, nameKeys) ??
    pickString(o, ["fullName", "full_name", "displayName", "display_name"]) ??
    "—"
  const email = pickString(o, emailKeys)
  return { id, name, email }
}

function mapTypeRef(raw: unknown): AdminCalendarTypeRef | null {
  const o = asRecord(raw)
  if (!o) {
    if (typeof raw === "string" && raw.trim()) {
      return { id: null, displayName: raw.trim() }
    }
    return null
  }
  const id = pickString(o, ["id", "uuid", "interviewTypeId", "interview_type_id"])
  const displayName = pickString(o, [
    "displayName",
    "display_name",
    "name",
    "label",
    "title",
    "code",
  ])
  if (!id && !displayName) return null
  return { id, displayName }
}

function mapModalityRef(raw: unknown): AdminCalendarModalityRef | null {
  const o = asRecord(raw)
  if (!o) return null
  const id = pickString(o, ["id", "uuid", "interviewModalityId", "interview_modality_id"])
  const displayName = pickString(o, ["displayName", "display_name", "name", "label"])
  if (!id && !displayName) return null
  return {
    id,
    displayName,
    includeGoogleMeetLink: pickBool(
      o,
      ["includeGoogleMeetLink", "include_google_meet_link"],
      false
    ),
  }
}

export function normalizeAdminCalendarEvent(raw: unknown): AdminCalendarEvent | null {
  const r = asRecord(raw)
  if (!r) return null

  const base = normalizeInterview(raw)
  const id = (base.id || pickString(r, ["id", "uuid", "interviewId"])) ?? ""
  if (!id) return null

  const startUtc =
    pickString(r, [
      "startUtc",
      "start_utc",
      "StartUtc",
      "scheduledAtUtc",
      "scheduled_at_utc",
    ]) ?? base.scheduledAtUtc
  if (!startUtc) return null

  const durationMinutes =
    pickNumber(r, ["durationMinutes", "duration_minutes"]) ?? base.durationMinutes
  let endUtc =
    pickString(r, ["endUtc", "end_utc", "EndUtc", "endsAtUtc", "ends_at_utc"]) ?? ""
  if (!endUtc && durationMinutes != null && durationMinutes > 0) {
    const startMs = new Date(startUtc).getTime()
    if (!Number.isNaN(startMs)) {
      endUtc = new Date(startMs + durationMinutes * 60_000).toISOString()
    }
  }
  if (!endUtc) {
    const startMs = new Date(startUtc).getTime()
    endUtc = Number.isNaN(startMs)
      ? startUtc
      : new Date(startMs + 60 * 60_000).toISOString()
  }

  const candidateRaw = r.candidate ?? r.Candidate ?? r.candidateProfile ?? r.candidate_profile
  const candidateFromNested = mapNestedPerson(
    candidateRaw,
    ["profileId", "candidateProfileId", "candidate_profile_id", "id"],
    ["name", "fullName", "full_name", "displayName"],
    ["email", "Email"]
  )
  const candidate: AdminCalendarCandidate = {
    profileId:
      candidateFromNested.id ||
      base.candidateProfileId ||
      pickString(r, ["candidateProfileId", "candidate_profile_id"]) ||
      "",
    name:
      candidateFromNested.name !== "—"
        ? candidateFromNested.name
        : pickString(r, ["candidateName", "candidate_name"]) ?? "Candidato",
    email:
      candidateFromNested.email ??
      pickString(r, ["candidateEmail", "candidate_email"]),
  }

  const vacancyRaw = r.vacancy ?? r.Vacancy
  const vacancyNested = asRecord(vacancyRaw)
  const vacancyId =
    pickString(vacancyNested ?? r, ["id", "vacancyId", "vacancy_id"]) ??
    base.vacancyId
  const vacancyTitle =
    pickString(vacancyNested ?? r, [
      "title",
      "name",
      "jobTitle",
      "job_title",
      "vacancyTitle",
      "vacancy_title",
    ]) ??
    base.jobTitle ??
    "Vacante"
  const companyRaw = vacancyNested?.company ?? vacancyNested?.Company ?? r.company
  const companyRec = asRecord(companyRaw)
  const companyId =
    pickString(companyRec ?? vacancyNested ?? r, [
      "companyId",
      "company_id",
      "id",
    ]) ?? null
  const companyName =
    pickString(companyRec ?? vacancyNested ?? r, [
      "companyName",
      "company_name",
      "name",
    ]) ?? null

  const recruiterRaw =
    r.recruiter ??
    r.Recruiter ??
    r.scheduledBy ??
    r.scheduledByUser ??
    r.scheduled_by_user
  const recruiterNested = mapNestedPerson(
    recruiterRaw,
    ["userId", "user_id", "id"],
    ["userName", "user_name", "name", "displayName"],
    ["email", "Email"]
  )
  const recruiter: AdminCalendarRecruiter = {
    userId:
      recruiterNested.id ||
      pickString(r, ["scheduledByUserId", "scheduled_by_user_id", "recruiterUserId"]) ||
      "",
    userName:
      recruiterNested.name !== "—"
        ? recruiterNested.name
        : pickString(r, ["recruiterUserName", "recruiter_user_name"]) ?? "—",
    email:
      recruiterNested.email ??
      pickString(r, ["recruiterEmail", "recruiter_email"]),
  }

  const typeRaw = r.interviewType ?? r.interview_type ?? base.interviewType
  const interviewType =
    mapTypeRef(typeRaw) ??
    (base.interviewType || base.interviewTypeLabel
      ? {
          id: base.interviewTypeId,
          displayName: base.interviewTypeLabel ?? base.interviewType,
        }
      : null)

  const modalityRaw = r.interviewModality ?? r.interview_modality
  const interviewModality =
    mapModalityRef(modalityRaw) ??
    (base.interviewModality
      ? {
          id: base.interviewModality.id,
          displayName: base.interviewModality.displayName,
          includeGoogleMeetLink: base.interviewModality.includeGoogleMeetLink,
        }
      : null)

  return {
    id,
    startUtc,
    endUtc,
    durationMinutes,
    status: base.status,
    statusDisplayName: base.statusDisplayName,
    interviewStatusId: base.interviewStatusId,
    candidate,
    vacancy: {
      id: vacancyId,
      title: vacancyTitle,
      companyId,
      companyName,
    },
    recruiter,
    interviewType,
    interviewModality,
    interviewerName: base.interviewerName,
    googleMeetUrl: base.googleMeetUrl,
    googleCalendarEventId: pickString(r, [
      "googleCalendarEventId",
      "google_calendar_event_id",
      "GoogleCalendarEventId",
    ]),
  }
}

function normalizeAdminCalendarList(data: unknown): AdminCalendarEvent[] {
  const rawList: unknown[] = []
  if (Array.isArray(data)) rawList.push(...data)
  else {
    const r = asRecord(data)
    const nested = r?.items ?? r?.interviews ?? r?.data ?? r?.events
    if (Array.isArray(nested)) rawList.push(...nested)
  }
  const out: AdminCalendarEvent[] = []
  rawList.forEach((item) => {
    const ev = normalizeAdminCalendarEvent(item)
    if (ev) out.push(ev)
  })
  return out
}

function buildCalendarQueryString(q: AdminCalendarQuery): string {
  const params = new URLSearchParams()
  if (q.fromUtc) params.set("fromUtc", q.fromUtc)
  if (q.toUtc) params.set("toUtc", q.toUtc)
  if (q.vacancyId) params.set("vacancyId", q.vacancyId)
  if (q.recruiterUserId) params.set("recruiterUserId", q.recruiterUserId)
  if (q.interviewStatusId) params.set("interviewStatusId", q.interviewStatusId)
  if (q.companyId) params.set("companyId", q.companyId)
  if (q.includeCancelled === true) params.set("includeCancelled", "true")
  const s = params.toString()
  return s ? `?${s}` : ""
}

export function getAdminCalendarHttpErrorMessage(status: number, err: unknown): string {
  if (status === 403) {
    return "Solo administradores pueden ver el calendario general de entrevistas."
  }
  if (status === 400) {
    const detail = getInterviewHttpErrorMessage(status, err)
    if (detail.toLowerCase().includes("366") || detail.toLowerCase().includes("rango")) {
      return detail
    }
    return detail !== "Error desconocido"
      ? detail
      : "El rango de fechas no es válido (máximo 366 días)."
  }
  return getInterviewHttpErrorMessage(status, err)
}

export async function getAdminInterviewsCalendar(
  query: AdminCalendarQuery = {}
): Promise<AdminCalendarEvent[]> {
  const qs = buildCalendarQueryString(query)
  const data = await apiClient.get(`/api/recruiter/interviews/calendar${qs}`)
  return normalizeAdminCalendarList(data)
}

export interface RecruiterVacancyOption {
  id: string
  title: string
  companyId: string | null
}

export async function fetchRecruiterVacancyOptions(): Promise<RecruiterVacancyOption[]> {
  const list = await listAllRecruiterVacancies()
  const out: RecruiterVacancyOption[] = []
  list.forEach((item: unknown, i: number) => {
    const o = asRecord(item)
    if (!o) return
    const id = pickString(o, ["id", "uuid"]) ?? String(i)
    const title = pickString(o, ["title", "name", "jobTitle"]) ?? "—"
    const companyId = pickString(o, ["companyId", "company_id"]) ?? null
    out.push({ id, title, companyId })
  })
  return out
}
