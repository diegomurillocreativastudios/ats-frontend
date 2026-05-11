import { apiClient } from "@/lib/api"
import { mapDefaultCompanyDisplayLabel } from "@/lib/public-company-display"

export const REPORTS_PREFIX = "/api/recruiter/reports"

export interface ReportsPagedResponse<T> {
  rows: T[]
  totalCount: number
}

function coerceReportsPayload<T>(raw: unknown): ReportsPagedResponse<T> {
  if (!raw || typeof raw !== "object") {
    return { rows: [], totalCount: 0 }
  }
  const rec = raw as Record<string, unknown>
  const rowsRaw = rec.rows ?? rec.Rows ?? rec.items ?? []
  const rows = Array.isArray(rowsRaw) ? (rowsRaw as T[]) : []
  const totalRaw = rec.totalCount ?? rec.TotalCount ?? rows.length
  const totalCount =
    typeof totalRaw === "number" && !Number.isNaN(totalRaw)
      ? totalRaw
      : Number.parseInt(String(totalRaw), 10) || rows.length
  return { rows, totalCount }
}

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v == null || String(v).trim() === "") continue
    sp.set(k, String(v).trim())
  }
  const q = sp.toString()
  return q ? `?${q}` : ""
}

/** Fila avance vacantes (campos flexibles por versión del API). */
export interface VacancyProgressByClientRow {
  clientId?: string
  clientName?: string
  companyName?: string
  vacancyId?: string
  vacancyTitle?: string
  vacancyStatus?: string
  openedAt?: string | null
  closedAt?: string | null
  totalCandidates?: number
  averageApplicationProgressPercent?: number
  progressPercent?: number
  candidatesByStage?: Record<string, number>
  /** Si el backend envía totales por categoría (alternativa al mapa por etapa). */
  candidatesInInterview?: number
  candidatesFinalist?: number
  candidatesHired?: number
  averageDaysToFill?: number | null
}

export async function fetchVacancyProgressByClient(query: {
  clientId?: string
  vacancyStatus?: string
  dateFrom?: string
  dateTo?: string
}): Promise<ReportsPagedResponse<VacancyProgressByClientRow>> {
  const raw = await apiClient.get(
    `${REPORTS_PREFIX}/vacancy-progress-by-client${buildQuery({
      clientId: query.clientId,
      vacancyStatus: query.vacancyStatus,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    })}`
  )
  return coerceReportsPayload<VacancyProgressByClientRow>(raw)
}

export interface CandidateStatusByStageRow {
  candidateProfileId?: string
  candidateName?: string
  vacancyId?: string
  vacancyTitle?: string
  currentStageId?: string
  currentStageName?: string
  stageName?: string
  pipelineStatus?: string
  applicationStatus?: string
  lastMovedAt?: string | null
  companyName?: string
  clientName?: string
  daysInStage?: number | null
  ownerName?: string
  recruiterName?: string
}

export async function fetchCandidateStatusByStage(query: {
  clientId?: string
  vacancyId?: string
  stageId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}): Promise<ReportsPagedResponse<CandidateStatusByStageRow>> {
  const raw = await apiClient.get(
    `${REPORTS_PREFIX}/candidate-status-by-stage${buildQuery({
      clientId: query.clientId,
      vacancyId: query.vacancyId,
      stageId: query.stageId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page:
        query.page != null ? String(query.page) : undefined,
      pageSize:
        query.pageSize != null ? String(query.pageSize) : undefined,
    })}`
  )
  return coerceReportsPayload<CandidateStatusByStageRow>(raw)
}

/** Respuesta opcional del endpoint de agregación (si el backend la expone). */
export interface CandidatePipelineSummary {
  totalCandidates: number
  byStage: { stageId: string; stageName: string; count: number }[]
}

function coercePipelineSummary(raw: unknown): CandidatePipelineSummary | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  const totalRaw =
    rec.totalCandidates ?? rec.TotalCandidates ?? rec.total ?? rec.count
  const totalCandidates =
    typeof totalRaw === "number" && !Number.isNaN(totalRaw)
      ? totalRaw
      : Number.parseInt(String(totalRaw ?? "0"), 10) || 0

  const byStageRaw = rec.byStage ?? rec.ByStage ?? rec.stages
  let byStage: { stageId: string; stageName: string; count: number }[] = []

  if (Array.isArray(byStageRaw)) {
    byStage = byStageRaw.map((item: unknown, i: number) => {
      const o = (item ?? {}) as Record<string, unknown>
      return {
        stageId: String(o.stageId ?? o.id ?? o.StageId ?? i),
        stageName: String(o.stageName ?? o.name ?? o.StageName ?? "—"),
        count:
          typeof o.count === "number" && !Number.isNaN(o.count)
            ? o.count
            : Number.parseInt(String(o.count ?? o.Count ?? 0), 10) || 0,
      }
    })
  } else if (byStageRaw && typeof byStageRaw === "object") {
    byStage = Object.entries(byStageRaw as Record<string, unknown>).map(
      ([key, val], i) => ({
        stageId: String(i),
        stageName: key,
        count:
          typeof val === "number" && !Number.isNaN(val)
            ? val
            : Number.parseInt(String(val), 10) || 0,
      })
    )
  }

  return { totalCandidates, byStage }
}

/**
 * Intenta cargar agregados del embudo. Si el endpoint no existe (404) u otro error, devuelve null.
 */
export async function tryFetchCandidatePipelineSummary(query: {
  clientId?: string
  vacancyId?: string
  stageId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<CandidatePipelineSummary | null> {
  try {
    const raw = await apiClient.get(
      `${REPORTS_PREFIX}/candidate-status-by-stage/summary${buildQuery({
        clientId: query.clientId,
        vacancyId: query.vacancyId,
        stageId: query.stageId,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })}`
    )
    return coercePipelineSummary(raw)
  } catch {
    return null
  }
}

export interface TechnicalEvaluationRow {
  candidateProfileId?: string
  candidateName?: string
  vacancyId?: string
  vacancyTitle?: string
  evaluationTitle?: string
  testName?: string
  scoreOrOutcome?: string
  status?: string
  outcome?: string
  evaluatorName?: string
  evaluatedAt?: string | null
  companyName?: string
  clientName?: string
  sentAt?: string | null
  completedAt?: string | null
  difficultyLevel?: string
  aiRecommendation?: string
  /** JSON string o objeto con puntajes por habilidad (según backend). */
  skillBreakdown?: unknown
}

export async function fetchTechnicalEvaluations(query: {
  vacancyId?: string
  outcome?: string
  dateFrom?: string
  dateTo?: string
}): Promise<ReportsPagedResponse<TechnicalEvaluationRow>> {
  const raw = await apiClient.get(
    `${REPORTS_PREFIX}/technical-evaluations${buildQuery({
      vacancyId: query.vacancyId,
      outcome: query.outcome,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    })}`
  )
  return coerceReportsPayload<TechnicalEvaluationRow>(raw)
}

export interface RecruitmentSourceRow {
  sourceKey?: string
  applicationSource?: string
  sourceLabel?: string
  label?: string
  candidatesCount?: number
  hiresCount?: number
  conversionPercent?: number | null
  preselectedCount?: number
  interviewedCount?: number
  finalistsCount?: number
}

export async function fetchRecruitmentSources(query: {
  dateFrom: string
  dateTo: string
  clientId?: string
  vacancyId?: string
}): Promise<ReportsPagedResponse<RecruitmentSourceRow>> {
  const raw = await apiClient.get(
    `${REPORTS_PREFIX}/recruitment-sources${buildQuery({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      clientId: query.clientId,
      vacancyId: query.vacancyId,
    })}`
  )
  return coerceReportsPayload<RecruitmentSourceRow>(raw)
}

export interface RecruiterCompanyOption {
  id: string
  name: string
}

export async function listRecruiterCompanies(): Promise<
  RecruiterCompanyOption[]
> {
  const raw = await apiClient.get("/api/recruiter/companies")
  const list = Array.isArray(raw)
    ? raw
    : (raw as { companies?: unknown })?.companies ??
      (raw as { items?: unknown })?.items ??
      (raw as { data?: unknown })?.data ??
      []
  if (!Array.isArray(list)) return []
  return list.map((item: Record<string, unknown>, i: number) => ({
    id: String(item?.id ?? item?.uuid ?? i),
    name: mapDefaultCompanyDisplayLabel(
      String(item?.name ?? item?.companyName ?? "—")
    ),
  }))
}

export interface RecruiterVacancyOption {
  id: string
  title: string
}

export async function listRecruiterVacancies(): Promise<
  RecruiterVacancyOption[]
> {
  const raw = await apiClient.get("/api/recruiter/vacancies")
  const list = Array.isArray(raw)
    ? raw
    : (raw as { vacancies?: unknown })?.vacancies ??
      (raw as { items?: unknown })?.items ??
      (raw as { data?: unknown })?.data ??
      []
  if (!Array.isArray(list)) return []
  return list.map((item: Record<string, unknown>, i: number) => ({
    id: String(item?.id ?? item?.uuid ?? i),
    title: String(item?.title ?? item?.name ?? "—"),
  }))
}

export interface RecruiterStageOption {
  id: string
  name: string
}

export async function listRecruiterStages(
  companyId: string
): Promise<RecruiterStageOption[]> {
  if (!companyId.trim()) return []
  const raw = await apiClient.get(
    `/api/recruiter/companies/${encodeURIComponent(companyId)}/stages`
  )
  const list = Array.isArray(raw)
    ? raw
    : (raw as { stages?: unknown })?.stages ??
      (raw as { items?: unknown })?.items ??
      (raw as { data?: unknown })?.data ??
      []
  if (!Array.isArray(list)) return []
  return list
    .map((item: Record<string, unknown>, i: number) => ({
      id: String(item?.id ?? item?.uuid ?? i),
      name: String(item?.name ?? item?.stageName ?? "—"),
      order:
        typeof item?.orderIndex === "number"
          ? item.orderIndex
          : typeof item?.order === "number"
            ? item.order
            : i,
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ id, name }) => ({ id, name }))
}
