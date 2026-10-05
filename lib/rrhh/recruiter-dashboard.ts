export const DASHBOARD_UPCOMING_INTERVIEW_DAYS = 7
export const DASHBOARD_STALE_CANDIDATE_DAYS = 14
export const DASHBOARD_SLOW_VACANCY_DAYS = 21

export const RECRUITER_DASHBOARD_LINKS = {
  home: "/portal-rrhh",
  candidates: "/portal-rrhh/candidatos",
  vacancies: "/portal-rrhh/vacantes",
  interviews: "/portal-rrhh/entrevistas",
  calendar: "/portal-rrhh/configuracion/calendario",
  reports: "/portal-rrhh/reportes",
  staleCandidatesReport: "/portal-rrhh/reportes/estatus-candidatos-por-etapa",
  technicalEvaluationsReport: "/portal-rrhh/reportes/evaluaciones-tecnicas",
} as const

export const REMINDER_DETAIL_PREFIX = "/portal-rrhh/recordatorios"

export type DashboardSourceState = "ready" | "partial" | "unavailable" | "error"

export type DashboardSeverity = "critical" | "action" | "upcoming" | "info"

export type DashboardMetricKey =
  | "activeVacancies"
  | "upcomingInterviews"
  | "staleCandidates"
  | "pendingEvaluations"

export const DASHBOARD_METRIC_KEYS: readonly DashboardMetricKey[] = [
  "activeVacancies",
  "upcomingInterviews",
  "staleCandidates",
  "pendingEvaluations",
] as const

export type DashboardReminderKey =
  | "upcomingInterviews"
  | "unconfirmedInterviews"
  | "newCandidates"
  | "staleCandidates"
  | "vacanciesClosingSoon"
  | "inactiveVacancies"
  | "pendingEvaluations"
  | "pendingTechnicalSheets"
  | "pendingApprovals"
  | "overdueFollowUps"
  | "pendingConsents"
  | "pendingDocuments"

export const DASHBOARD_REMINDER_KEYS: readonly DashboardReminderKey[] = [
  "upcomingInterviews",
  "unconfirmedInterviews",
  "newCandidates",
  "staleCandidates",
  "vacanciesClosingSoon",
  "inactiveVacancies",
  "pendingEvaluations",
  "pendingTechnicalSheets",
  "pendingApprovals",
  "overdueFollowUps",
  "pendingConsents",
  "pendingDocuments",
] as const

export interface DashboardMetric {
  key: DashboardMetricKey
  value: number | null
  sourceState: DashboardSourceState
  href: string
}

export interface DashboardReminderContext {
  days?: number
  analyzed?: number
  total?: number
}

export interface DashboardReminder {
  key: DashboardReminderKey
  count: number | null
  severity: DashboardSeverity
  href: string | null
  sourceState: DashboardSourceState
  dueAt: string | null
  context: DashboardReminderContext | null
}

export interface RecruiterDashboardModel {
  generatedAt: string
  metrics: DashboardMetric[]
  reminders: DashboardReminder[]
}

const REMINDER_SEVERITY: Record<DashboardReminderKey, DashboardSeverity> = {
  staleCandidates: "critical",
  overdueFollowUps: "critical",
  unconfirmedInterviews: "action",
  newCandidates: "action",
  pendingEvaluations: "action",
  pendingTechnicalSheets: "action",
  pendingApprovals: "action",
  pendingConsents: "action",
  pendingDocuments: "action",
  upcomingInterviews: "upcoming",
  vacanciesClosingSoon: "upcoming",
  inactiveVacancies: "info",
}

const REMINDER_FALLBACK_LINK: Record<DashboardReminderKey, string | null> = {
  upcomingInterviews: RECRUITER_DASHBOARD_LINKS.interviews,
  unconfirmedInterviews: RECRUITER_DASHBOARD_LINKS.interviews,
  newCandidates: RECRUITER_DASHBOARD_LINKS.candidates,
  staleCandidates: RECRUITER_DASHBOARD_LINKS.candidates,
  vacanciesClosingSoon: RECRUITER_DASHBOARD_LINKS.vacancies,
  inactiveVacancies: RECRUITER_DASHBOARD_LINKS.vacancies,
  pendingEvaluations: RECRUITER_DASHBOARD_LINKS.vacancies,
  pendingTechnicalSheets: RECRUITER_DASHBOARD_LINKS.vacancies,
  pendingApprovals: RECRUITER_DASHBOARD_LINKS.vacancies,
  overdueFollowUps: RECRUITER_DASHBOARD_LINKS.candidates,
  pendingConsents: null,
  pendingDocuments: null,
}

const METRIC_LINK: Record<DashboardMetricKey, string> = {
  activeVacancies: RECRUITER_DASHBOARD_LINKS.vacancies,
  upcomingInterviews: reminderDetailLink("upcomingInterviews"),
  staleCandidates: reminderDetailLink("staleCandidates"),
  pendingEvaluations: reminderDetailLink("pendingEvaluations"),
}

const METRIC_KEY_SET: ReadonlySet<string> = new Set(DASHBOARD_METRIC_KEYS)
const REMINDER_KEY_SET: ReadonlySet<string> = new Set(DASHBOARD_REMINDER_KEYS)
const SOURCE_STATE_SET: ReadonlySet<string> = new Set([
  "ready",
  "partial",
  "unavailable",
  "error",
])

export function reminderDetailLink(key: DashboardReminderKey): string {
  return `${REMINDER_DETAIL_PREFIX}/${key}`
}

export function isDashboardReminderKey(value: unknown): value is DashboardReminderKey {
  return typeof value === "string" && REMINDER_KEY_SET.has(value)
}

export function isDashboardMetricKey(value: unknown): value is DashboardMetricKey {
  return typeof value === "string" && METRIC_KEY_SET.has(value)
}

export function normalizeRecruiterDashboard(
  raw: unknown,
  now: Date = new Date()
): RecruiterDashboardModel {
  const record =
    raw != null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}

  const generatedAt = readString(record, ["generatedAt", "GeneratedAt"]) ?? now.toISOString()
  const metrics = normalizeMetrics(record.metrics ?? record.Metrics)
  const reminders = normalizeReminders(record.reminders ?? record.Reminders)
  return { generatedAt, metrics, reminders }
}

function normalizeMetrics(raw: unknown): DashboardMetric[] {
  const byKey = indexByKey(raw)
  return DASHBOARD_METRIC_KEYS.map((key) => {
    const entry = byKey.get(key)
    return {
      key,
      value: entry ? pickCount(entry) : null,
      sourceState: entry ? pickSourceState(entry) : "unavailable",
      href: METRIC_LINK[key],
    }
  })
}

function normalizeReminders(raw: unknown): DashboardReminder[] {
  const byKey = indexByKey(raw)
  return DASHBOARD_REMINDER_KEYS.map((key) => {
    const entry = byKey.get(key)
    const sourceState = entry ? pickSourceState(entry) : "unavailable"
    const count = entry ? pickCount(entry) : null
    const dueAt = entry ? readString(entry, ["dueAt", "DueAt"]) : null
    const context = entry ? pickContext(entry) : null
    return {
      key,
      count,
      sourceState,
      severity: REMINDER_SEVERITY[key],
      dueAt: dueAt ?? null,
      context: enrichContext(key, context),
      href: resolveReminderHref(key, sourceState, count),
    }
  })
}

function resolveReminderHref(
  key: DashboardReminderKey,
  sourceState: DashboardSourceState,
  count: number | null
): string | null {
  if (sourceState === "ready" || sourceState === "partial") {
    if (count != null && count > 0) return reminderDetailLink(key)
    return null
  }
  if (sourceState === "error") return null
  return REMINDER_FALLBACK_LINK[key]
}

function indexByKey(raw: unknown): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>()
  if (!Array.isArray(raw)) return map
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue
    const entry = item as Record<string, unknown>
    const key = readString(entry, ["key", "Key"])
    if (key && !map.has(key)) map.set(key, entry)
  }
  return map
}

function pickSourceState(entry: Record<string, unknown>): DashboardSourceState {
  const raw = readString(entry, ["sourceState", "SourceState", "state", "State"])
  if (raw && SOURCE_STATE_SET.has(raw)) return raw as DashboardSourceState
  return "unavailable"
}

function pickCount(entry: Record<string, unknown>): number | null {
  const raw = entry.count ?? entry.Count ?? entry.value ?? entry.Value
  if (raw == null) return null
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function pickContext(entry: Record<string, unknown>): DashboardReminderContext | null {
  const context = entry.context ?? entry.Context
  if (!context || typeof context !== "object" || Array.isArray(context)) return null
  const record = context as Record<string, unknown>
  const result: DashboardReminderContext = {}
  const days = readInt(record, ["days", "Days"])
  if (days != null) result.days = days
  const analyzed = readInt(record, ["analyzed", "Analyzed"])
  if (analyzed != null) result.analyzed = analyzed
  const total = readInt(record, ["total", "Total"])
  if (total != null) result.total = total
  return Object.keys(result).length > 0 ? result : null
}

function enrichContext(
  key: DashboardReminderKey,
  context: DashboardReminderContext | null
): DashboardReminderContext | null {
  const defaults = DEFAULT_REMINDER_CONTEXT[key]
  if (!defaults && !context) return null
  return { ...(defaults ?? {}), ...(context ?? {}) }
}

const DEFAULT_REMINDER_CONTEXT: Partial<
  Record<DashboardReminderKey, DashboardReminderContext>
> = {
  upcomingInterviews: { days: DASHBOARD_UPCOMING_INTERVIEW_DAYS },
  staleCandidates: { days: DASHBOARD_STALE_CANDIDATE_DAYS },
  inactiveVacancies: { days: DASHBOARD_SLOW_VACANCY_DAYS },
}

function readString(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim() !== "") return value.trim()
  }
  return null
}

function readInt(
  record: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number.parseInt(value, 10)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

export function isActionableReminder(reminder: DashboardReminder): boolean {
  if (reminder.sourceState === "error") return true
  if (reminder.sourceState !== "ready" && reminder.sourceState !== "partial") {
    return false
  }
  return reminder.count != null && reminder.count > 0
}

export function sortDashboardReminders(
  reminders: readonly DashboardReminder[],
  getLabel: (key: DashboardReminderKey) => string
): DashboardReminder[] {
  return [...reminders].sort((a, b) => {
    const severityDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (severityDiff !== 0) return severityDiff
    const dueDiff = compareDueAt(a.dueAt, b.dueAt)
    if (dueDiff !== 0) return dueDiff
    return getLabel(a.key).localeCompare(getLabel(b.key))
  })
}

function compareDueAt(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a == null) return 1
  if (b == null) return -1
  return new Date(a).getTime() - new Date(b).getTime()
}

const SEVERITY_RANK: Record<DashboardSeverity, number> = {
  critical: 0,
  action: 1,
  upcoming: 2,
  info: 3,
}

export interface ReminderDetailItem {
  id: string
  applicationId: string | null
  candidateProfileId: string | null
  candidateName: string | null
  vacancyId: string | null
  vacancyTitle: string | null
  companyName: string | null
  dueAt: string | null
  statusLabel: string | null
}

export interface ReminderDetailModel {
  key: DashboardReminderKey
  sourceState: DashboardSourceState
  totalCount: number | null
  items: ReminderDetailItem[]
}

export function normalizeReminderDetail(
  key: DashboardReminderKey,
  raw: unknown
): ReminderDetailModel {
  const record =
    raw != null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const sourceState = pickSourceState(record)
  const totalCount = readInt(record, ["totalCount", "TotalCount"])
  const itemsRaw = record.items ?? record.Items ?? record.rows ?? record.Rows
  const items = Array.isArray(itemsRaw) ? itemsRaw.map(normalizeDetailItem).filter(nonNull) : []
  return { key, sourceState, totalCount, items }
}

function normalizeDetailItem(raw: unknown): ReminderDetailItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const id = readString(record, ["id", "Id", "ID"])
  if (!id) return null
  return {
    id,
    applicationId: readString(record, ["applicationId", "ApplicationId"]),
    candidateProfileId: readString(record, [
      "candidateProfileId",
      "CandidateProfileId",
    ]),
    candidateName: readString(record, ["candidateName", "CandidateName"]),
    vacancyId: readString(record, ["vacancyId", "VacancyId"]),
    vacancyTitle: readString(record, ["vacancyTitle", "VacancyTitle"]),
    companyName: readString(record, ["companyName", "CompanyName"]),
    dueAt: readString(record, ["dueAt", "DueAt"]),
    statusLabel: readString(record, ["statusLabel", "StatusLabel"]),
  }
}

function nonNull<T>(value: T | null): value is T {
  return value != null
}

const REMINDERS_WITHOUT_CANDIDATE: ReadonlySet<DashboardReminderKey> = new Set([
  "vacanciesClosingSoon",
  "inactiveVacancies",
])

export function reminderIncludesCandidate(key: DashboardReminderKey): boolean {
  return !REMINDERS_WITHOUT_CANDIDATE.has(key)
}

export function resolveReminderRowHref(
  key: DashboardReminderKey,
  item: ReminderDetailItem
): string | null {
  switch (key) {
    case "upcomingInterviews":
    case "unconfirmedInterviews":
      return `/portal-rrhh/interviews/${item.id}`
    case "vacanciesClosingSoon":
    case "inactiveVacancies":
      return item.vacancyId ? `/portal-rrhh/vacantes/${item.vacancyId}` : null
    case "newCandidates":
    case "staleCandidates":
    case "pendingTechnicalSheets":
    case "pendingDocuments":
    case "pendingEvaluations":
    case "overdueFollowUps":
    case "pendingConsents":
      return item.candidateProfileId
        ? `/portal-rrhh/candidatos/${item.candidateProfileId}`
        : null
    case "pendingApprovals":
      return null
  }
}
