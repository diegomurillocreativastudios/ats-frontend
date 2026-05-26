import { apiClient } from "@/lib/api"

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
  candidatesInInterview?: number
  candidatesFinalist?: number
  candidatesHired?: number
  averageDaysToFill?: number | null
  /** Métricas IA agregadas (0–100). */
  averagePreliminaryMatchScore?: number | null
  maxPreliminaryMatchScore?: number | null
  minPreliminaryMatchScore?: number | null
  candidatesWithPreliminaryAnalysis?: number | null
}

export async function fetchVacancyProgressByClient(query: {
  clientId?: string
  vacancyStatus?: string
  vacancyId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDirection?: "asc" | "desc"
}): Promise<ReportsPagedResponse<VacancyProgressByClientRow>> {
  const raw = await apiClient.get(
    `${REPORTS_PREFIX}/vacancy-progress-by-client${buildQuery({
      clientId: query.clientId,
      vacancyStatus: query.vacancyStatus,
      vacancyId: query.vacancyId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page != null ? String(query.page) : undefined,
      pageSize: query.pageSize != null ? String(query.pageSize) : undefined,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
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

export interface CandidatePipelineStageSummary {
  stageId: string
  stageName: string
  count: number
  /** 0–100 respecto del total de aplicaciones (backend). */
  percent?: number | null
}

/** Respuesta opcional del endpoint de agregación (si el backend la expone). Acepta totalApplications o totalCandidates. */
export interface CandidatePipelineSummary {
  totalCandidates: number
  byStage: CandidatePipelineStageSummary[]
}

function coercePipelineSummary(raw: unknown): CandidatePipelineSummary | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  const totalRaw =
    rec.totalApplications ??
    rec.TotalApplications ??
    rec.totalCandidates ??
    rec.TotalCandidates ??
    rec.total ??
    rec.count
  const totalCandidates =
    typeof totalRaw === "number" && !Number.isNaN(totalRaw)
      ? totalRaw
      : Number.parseInt(String(totalRaw ?? "0"), 10) || 0

  const byStageRaw = rec.byStage ?? rec.ByStage ?? rec.stages
  let byStage: CandidatePipelineStageSummary[] = []

  if (Array.isArray(byStageRaw)) {
    byStage = byStageRaw.map((item: unknown, i: number) => {
      const o = (item ?? {}) as Record<string, unknown>
      const pctRaw = o.percent ?? o.Percent
      const percent =
        typeof pctRaw === "number" && !Number.isNaN(pctRaw)
          ? pctRaw
          : pctRaw != null
            ? Number.parseFloat(String(pctRaw))
            : null
      return {
        stageId: String(o.stageId ?? o.id ?? o.StageId ?? i),
        stageName: String(o.stageName ?? o.name ?? o.StageName ?? "—"),
        count:
          typeof o.count === "number" && !Number.isNaN(o.count)
            ? o.count
            : Number.parseInt(String(o.count ?? o.Count ?? 0), 10) || 0,
        percent:
          percent != null && !Number.isNaN(percent) ? percent : undefined,
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

  const denom = totalCandidates > 0 ? totalCandidates : 0
  if (denom > 0) {
    byStage = byStage.map((s) => {
      let pct = s.percent
      if (pct == null || Number.isNaN(Number(pct))) {
        pct = (s.count / denom) * 100
      }
      return { ...s, percent: pct }
    })
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
  candidateId?: string
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
  clientId?: string
  clientName?: string
  sentAt?: string | null
  completedAt?: string | null
  difficultyLevel?: string
  aiRecommendation?: string
  skillBreakdown?: unknown
}

export async function fetchTechnicalEvaluations(query: {
  vacancyId?: string
  clientId?: string
  candidateId?: string
  outcome?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}): Promise<ReportsPagedResponse<TechnicalEvaluationRow>> {
  const raw = await apiClient.get(
    `${REPORTS_PREFIX}/technical-evaluations${buildQuery({
      vacancyId: query.vacancyId,
      clientId: query.clientId,
      candidateId: query.candidateId,
      outcome: query.outcome,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page != null ? String(query.page) : undefined,
      pageSize: query.pageSize != null ? String(query.pageSize) : undefined,
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
  vacancyId?: string
  vacancyTitle?: string
  clientId?: string
  clientName?: string
}

export async function fetchRecruitmentSources(query: {
  dateFrom: string
  dateTo: string
  clientId?: string
  vacancyId?: string
  source?: string
  groupBy?: "source" | "vacancy"
  page?: number
  pageSize?: number
}): Promise<ReportsPagedResponse<RecruitmentSourceRow>> {
  const raw = await apiClient.get(
    `${REPORTS_PREFIX}/recruitment-sources${buildQuery({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      clientId: query.clientId,
      vacancyId: query.vacancyId,
      source: query.source,
      groupBy: query.groupBy,
      page: query.page != null ? String(query.page) : undefined,
      pageSize: query.pageSize != null ? String(query.pageSize) : undefined,
    })}`
  )
  return coerceReportsPayload<RecruitmentSourceRow>(raw)
}

/** Fila por aplicación del reporte salary-expectations (USD). */
export interface SalaryExpectationRow {
  applicationId?: string
  candidateProfileId?: string
  candidateName?: string
  clientId?: string
  clientName?: string
  vacancyId?: string
  vacancyTitle?: string
  currentStageId?: string
  currentStageName?: string
  pipelineStatus?: string
  appliedAt?: string | null
  expectedSalaryUsd?: number | null
  vacancyMinSalaryUsd?: number | null
  vacancyMaxSalaryUsd?: number | null
  withinRange?: boolean | null
  gapAmountUsd?: number | null
}

/** Bucket de la distribución salarial calculada por el backend. */
export interface SalaryDistributionBucket {
  lowerBoundUsd?: number | null
  upperBoundUsd?: number | null
  count?: number | null
  label?: string
}

/** Resumen agregado en USD calculado por el backend para salary-expectations. */
export interface SalaryExpectationsSummary {
  totalApplicationsAnalyzed?: number | null
  applicationsWithSalary?: number | null
  averageUsd?: number | null
  medianUsd?: number | null
  minUsd?: number | null
  maxUsd?: number | null
  percentile25Usd?: number | null
  percentile75Usd?: number | null
  distribution?: SalaryDistributionBucket[] | null
  withinRangeCount?: number | null
  aboveRangeCount?: number | null
  belowRangeCount?: number | null
}

/** Fila por usuario (Reclutador/Admin) del reporte recruiter-productivity. */
export interface RecruiterProductivityRow {
  userId?: string
  displayName?: string
  email?: string | null
  isAdmin?: boolean
  isRecruiter?: boolean
  candidatesAdded?: number | null
  applicationsManaged?: number | null
  openVacancies?: number | null
  interviewsScheduled?: number | null
  interviewsCompleted?: number | null
  stageMoves?: number | null
  hires?: number | null
  averageTimeToHireDays?: number | null
  conversionPercent?: number | null
  averagePreliminaryMatchScore?: number | null
}

/** Fila por vacante del reporte time-to-hire-kpi. */
export interface TimeToHireKpiRow {
  clientId?: string
  clientName?: string
  vacancyId?: string
  vacancyTitle?: string
  vacancyStatus?: string
  openedAt?: string | null
  firstHireAt?: string | null
  isFilled?: boolean | null
  timeToFillDays?: number | null
  timeToHireDays?: number | null
  daysOpen?: number | null
  isSlaBreached?: boolean | null
  averageDaysByStage?: Record<string, number | null> | null
  totalCandidates?: number | null
  candidatesHired?: number | null
}

/** Resumen agregado calculado por el backend para time-to-hire-kpi. */
export interface TimeToHireKpiSummary {
  totalVacancies?: number | null
  filledVacancies?: number | null
  openVacancies?: number | null
  averageTimeToFillDays?: number | null
  medianTimeToFillDays?: number | null
  minTimeToFillDays?: number | null
  maxTimeToFillDays?: number | null
  averageTimeToHireDays?: number | null
  medianTimeToHireDays?: number | null
  averageDaysOpenUnfilled?: number | null
  fillRatePercent?: number | null
  slaBreachedCount?: number | null
  slaThresholdDays?: number | null
}

export interface TimeToHireKpiAiMetric {
  metric?: string
  label?: string
  unit?: "days" | "percent" | string
  actual?: number | null
  benchmark?: number | null
  deltaAbsolute?: number | null
  deltaPercent?: number | null
  improvedVsBenchmark?: boolean | null
}

export interface TimeToHireKpiAiProcess {
  processKey?: string
  processLabel?: string
  aiMinutes?: number | null
  manualMinutes?: number | null
  deltaMinutes?: number | null
  savingsPercent?: number | null
}

export interface TimeToHireKpiAiComparison {
  metrics?: TimeToHireKpiAiMetric[]
  processes?: TimeToHireKpiAiProcess[]
}

/** Detalle score preliminar por candidato/postulación (0–100). */
export interface PreliminaryMatchScoreRow {
  candidateId?: string
  candidateProfileId?: string
  candidateName?: string
  /** Alias usado por algunos payloads del API. */
  candidateFullName?: string
  candidateEmail?: string
  applicationId?: string
  vacancyId?: string
  vacancyTitle?: string
  clientId?: string
  clientName?: string
  companyName?: string
  stageId?: string
  stageName?: string
  currentStageId?: string
  currentStageName?: string
  score?: number | null
  preliminaryMatchScore?: number | null
  matchLevel?: string
  level?: string
  status?: string
  analysisStatus?: string
  analyzedAt?: string | null
  createdAt?: string | null
  evaluatedAt?: string | null
}

export async function fetchPreliminaryMatchScores(query: {
  clientId?: string
  vacancyId?: string
  candidateId?: string
  stageId?: string
  scoreMin?: number
  scoreMax?: number
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDirection?: "asc" | "desc"
}): Promise<ReportsPagedResponse<PreliminaryMatchScoreRow>> {
  const raw = await apiClient.get(
    `${REPORTS_PREFIX}/preliminary-match-scores${buildQuery({
      clientId: query.clientId,
      vacancyId: query.vacancyId,
      candidateId: query.candidateId,
      stageId: query.stageId,
      scoreMin:
        query.scoreMin != null ? String(query.scoreMin) : undefined,
      scoreMax:
        query.scoreMax != null ? String(query.scoreMax) : undefined,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page != null ? String(query.page) : undefined,
      pageSize: query.pageSize != null ? String(query.pageSize) : undefined,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    })}`
  )
  return coerceReportsPayload<PreliminaryMatchScoreRow>(raw)
}

/**
 * Dashboard de reportes: un objeto JSON (sin rows/totalCount).
 * Campos alineados con el backend; el resto queda accesible vía índice si hace falta.
 */
export interface ReportsRecruiterSummary {
  totalClients?: number
  totalVacancies?: number
  openVacancies?: number
  closedVacancies?: number
  totalCandidates?: number
  candidatesInInterview?: number
  candidatesHired?: number
  averageVacancyProgressPercent?: number
  totalHires?: number
  hiredCount?: number
  averagePreliminaryMatchScore?: number
  technicalEvaluationsCount?: number
  technicalEvaluationsCompleted?: number
  technicalEvaluationApprovalRate?: number
  technicalEvaluationPassRate?: number | null
  approvalRate?: number
  mainRecruitmentSourceKey?: string
  mainRecruitmentSource?: string
  mainSourceLabel?: string
  topRecruitmentSource?: string
  [key: string]: unknown
}

function pickNum(
  rec: Record<string, unknown>,
  keys: string[]
): number | undefined {
  for (const k of keys) {
    const v = rec[k]
    if (typeof v === "number" && !Number.isNaN(v)) return v
    if (v != null && v !== "") {
      const n = Number.parseFloat(String(v))
      if (!Number.isNaN(n)) return n
    }
  }
  return undefined
}

function pickStr(
  rec: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = rec[k]
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return undefined
}

export function coerceReportsSummary(raw: unknown): ReportsRecruiterSummary {
  if (!raw || typeof raw !== "object") return {}
  const rec = raw as Record<string, unknown>
  const out: ReportsRecruiterSummary = { ...rec }
  out.totalClients = pickNum(rec, ["totalClients", "TotalClients"])
  out.totalVacancies = pickNum(rec, ["totalVacancies", "TotalVacancies"])
  out.openVacancies = pickNum(rec, ["openVacancies", "OpenVacancies"])
  out.closedVacancies = pickNum(rec, ["closedVacancies", "ClosedVacancies"])
  out.totalCandidates = pickNum(rec, ["totalCandidates", "TotalCandidates"])
  out.candidatesInInterview = pickNum(rec, [
    "candidatesInInterview",
    "CandidatesInInterview",
  ])
  out.candidatesHired = pickNum(rec, [
    "candidatesHired",
    "CandidatesHired",
    "hiredCount",
    "HiredCount",
    "totalHired",
    "totalHires",
    "TotalHires",
    "hiresCount",
  ])
  out.averageVacancyProgressPercent = pickNum(rec, [
    "averageVacancyProgressPercent",
    "AverageVacancyProgressPercent",
  ])
  out.totalHires = pickNum(rec, ["totalHires", "TotalHires", "hiresCount"])
  out.hiredCount = pickNum(rec, ["hiredCount", "HiredCount", "totalHired"])
  out.averagePreliminaryMatchScore = pickNum(rec, [
    "averagePreliminaryMatchScore",
    "AveragePreliminaryMatchScore",
    "avgPreliminaryMatchScore",
  ])
  out.technicalEvaluationsCount = pickNum(rec, [
    "technicalEvaluationsCount",
    "TechnicalEvaluationsCount",
  ])
  out.technicalEvaluationsCompleted = pickNum(rec, [
    "technicalEvaluationsCompleted",
    "TechnicalEvaluationsCompleted",
  ])
  if (
    out.technicalEvaluationsCount == null &&
    out.technicalEvaluationsCompleted != null
  ) {
    out.technicalEvaluationsCount = out.technicalEvaluationsCompleted
  }
  const passRateRaw =
    rec.technicalEvaluationPassRate ??
    rec.TechnicalEvaluationPassRate ??
    rec.technicalEvaluationApprovalRate ??
    rec.TechnicalEvaluationApprovalRate
  if (passRateRaw == null || passRateRaw === "") {
    out.technicalEvaluationPassRate = null
  } else if (typeof passRateRaw === "number" && !Number.isNaN(passRateRaw)) {
    out.technicalEvaluationPassRate = passRateRaw
  } else {
    const n = Number.parseFloat(String(passRateRaw))
    out.technicalEvaluationPassRate = Number.isNaN(n) ? null : n
  }
  out.technicalEvaluationApprovalRate = pickNum(rec, [
    "technicalEvaluationApprovalRate",
    "TechnicalEvaluationApprovalRate",
  ])
  out.approvalRate = pickNum(rec, ["approvalRate", "ApprovalRate"])
  out.mainRecruitmentSourceKey = pickStr(rec, [
    "mainRecruitmentSourceKey",
    "MainRecruitmentSourceKey",
    "mainSourceKey",
  ])
  out.mainRecruitmentSource = pickStr(rec, [
    "mainRecruitmentSource",
    "MainRecruitmentSource",
    "mainSource",
  ])
  out.mainSourceLabel = pickStr(rec, [
    "mainSourceLabel",
    "MainSourceLabel",
    "primarySourceLabel",
  ])
  out.topRecruitmentSource = pickStr(rec, [
    "topRecruitmentSource",
    "TopRecruitmentSource",
  ])
  return out
}

export async function fetchReportsSummary(query: {
  clientId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<ReportsRecruiterSummary> {
  const raw = await apiClient.get(
    `${REPORTS_PREFIX}/summary${buildQuery({
      clientId: query.clientId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    })}`
  )
  return coerceReportsSummary(raw)
}

export interface ReportsFilterOption {
  id: string
  name: string
}

export interface ReportsFiltersPayload {
  clients?: ReportsFilterOption[]
  vacancies?: ReportsFilterOption[]
  stages?: ReportsFilterOption[]
  technicalEvaluationOutcomes?: string[]
  recruitmentSourceKeys?: string[]
}

function mapIdNameList(raw: unknown): ReportsFilterOption[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: unknown, i: number) => {
    const o = (item ?? {}) as Record<string, unknown>
    return {
      id: String(o.id ?? o.uuid ?? o.key ?? i),
      name: String(o.name ?? o.title ?? o.label ?? "—"),
    }
  })
}

export function coerceReportsFilters(raw: unknown): ReportsFiltersPayload {
  if (!raw || typeof raw !== "object") return {}
  const rec = raw as Record<string, unknown>
  const clients =
    rec.clients ??
    rec.Clients ??
    rec.companies ??
    rec.Companies ??
    rec.companyOptions
  const vacancies =
    rec.vacancies ??
    rec.Vacancies ??
    rec.vacancyOptions ??
    rec.vacancySummaries
  const stages = rec.stages ?? rec.Stages ?? rec.stageOptions
  const outcomes =
    rec.technicalEvaluationOutcomes ??
    rec.TechnicalEvaluationOutcomes ??
    rec.evaluationOutcomes ??
    rec.outcomes
  const sourceKeys =
    rec.recruitmentSourceKeys ??
    rec.RecruitmentSourceKeys ??
    rec.sourceKeys ??
    rec.sources

  let technicalEvaluationOutcomes: string[] | undefined
  if (Array.isArray(outcomes)) {
    technicalEvaluationOutcomes = outcomes.map((x) => String(x))
  }

  let recruitmentSourceKeys: string[] | undefined
  if (Array.isArray(sourceKeys)) {
    recruitmentSourceKeys = sourceKeys.map((item: unknown) => {
      if (typeof item === "string") return item
      const o = (item ?? {}) as Record<string, unknown>
      return String(o.key ?? o.sourceKey ?? o.id ?? "")
    }).filter(Boolean)
  }

  return {
    clients: mapIdNameList(clients),
    vacancies: mapIdNameList(vacancies),
    stages: mapIdNameList(stages),
    technicalEvaluationOutcomes,
    recruitmentSourceKeys,
  }
}

export async function fetchReportsFilters(query: {
  clientId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<ReportsFiltersPayload> {
  const raw = await apiClient.get(
    `${REPORTS_PREFIX}/filters${buildQuery({
      clientId: query.clientId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    })}`
  )
  return coerceReportsFilters(raw)
}

export type { RecruiterCompanyOption, RecruiterStageOption } from "@/lib/api/recruiter-companies"
export { listRecruiterCompanies, listRecruiterStages } from "@/lib/api/recruiter-companies"

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

