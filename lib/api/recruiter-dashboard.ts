import { apiClient } from "@/lib/api"
import { QUERY_PAGE_SIZE_MAX } from "@/lib/api/query-paging"
import {
  normalizeRecruiterDashboard,
  normalizeReminderDetail,
  type DashboardReminderKey,
  type RecruiterDashboardModel,
  type ReminderDetailModel,
} from "@/lib/rrhh/recruiter-dashboard"

const DASHBOARD_PATH = "/api/recruiter/dashboard"

export async function fetchRecruiterDashboard(
  now: Date = new Date()
): Promise<RecruiterDashboardModel> {
  const raw = await apiClient.get(DASHBOARD_PATH)
  return normalizeRecruiterDashboard(raw, now)
}

export interface ReminderDetailQuery {
  page?: number
  pageSize?: number
  clientId?: string
}

export async function fetchRecruiterReminderDetail(
  key: DashboardReminderKey,
  query: ReminderDetailQuery = {}
): Promise<ReminderDetailModel> {
  const search = buildReminderDetailQuery(query)
  const raw = await apiClient.get(
    `${DASHBOARD_PATH}/reminders/${encodeURIComponent(key)}${search}`
  )
  return normalizeReminderDetail(key, raw)
}

function buildReminderDetailQuery(query: ReminderDetailQuery): string {
  const params = new URLSearchParams()
  const page = clampPage(query.page)
  const pageSize = clampPageSize(query.pageSize)
  params.set("page", String(page))
  params.set("pageSize", String(pageSize))
  if (query.clientId && query.clientId.trim() !== "") {
    params.set("clientId", query.clientId.trim())
  }
  return `?${params.toString()}`
}

function clampPage(value: number | undefined): number {
  if (value == null || !Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
}

function clampPageSize(value: number | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return 50
  return Math.min(Math.floor(value), QUERY_PAGE_SIZE_MAX)
}
