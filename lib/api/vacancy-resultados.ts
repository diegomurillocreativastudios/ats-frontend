import { apiClient } from "@/lib/api"
import { normalizeVacancyDetailFromApi } from "@/lib/vacancies/normalize-vacancy-detail-from-api"
import {
  listCompanyApplicantStatuses,
  listRecruiterCompanies,
  listRecruiterStages,
  persistVacancyCompanyId,
  resolveVacancyCompanyId,
} from "@/lib/api/recruiter-companies"
import {
  buildApplicantComponentScoreAverages,
  buildApplicantsGroupedByStageFull,
  buildScorePercentBuckets,
  buildScoreSummary,
  buildStageCounts,
  extractApplicantScores01,
  resolveOrderedStageNames,
  type ApplicantsByStageFullSection,
  type CompanyStatusOption,
  type ComponentScoreAverages,
  type ScoreBucketRow,
  type ScoreSummary,
  type StageCountRow,
  type VacancyApplicantLike,
} from "@/lib/rrhh/vacancy-pipeline-stats"

function kanbanStageNamesFromApiStages(
  stages: { name: string; order: number }[]
): string[] {
  const sorted = [...stages].sort((a, b) => a.order - b.order)
  return sorted.map((s) => s.name).filter((n) => n !== "")
}

function applicantsFromVacancyPayload(data: unknown): VacancyApplicantLike[] {
  const root = data as Record<string, unknown> | null | undefined
  if (!root || !Array.isArray(root.applicants)) return []
  return root.applicants as VacancyApplicantLike[]
}

function titleFromVacancyPayload(data: unknown): string | null {
  const root = data as Record<string, unknown> | null | undefined
  if (!root) return null
  const t = root.title ?? root.name ?? root.jobTitle ?? root.job_title
  if (t == null) return null
  const s = String(t).trim()
  return s !== "" ? s : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function labelFromMaybeObject(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === "string") {
    const t = value.trim()
    return t !== "" ? t : null
  }
  const o = asRecord(value)
  if (!o) return null
  const name = o.name ?? o.label ?? o.title
  if (name != null && String(name).trim() !== "") return String(name).trim()
  return null
}

export interface VacancyResultadosVacancyMeta {
  description: string | null
  status: string | null
  createdAt: string | null
  jobCategory: string | null
  company: string | null
  countryCode: string | null
  vacancyDepartmentLabel: string | null
  vacancyModalityLabel: string | null
  requirements: unknown
  weights: unknown
  aiMatchSuggestions: unknown[]
  needsRematch: boolean
}

function vacancyMetaFromPayload(data: unknown): VacancyResultadosVacancyMeta {
  const root = asRecord(data) ?? {}
  const aiRaw = root.aiMatchSuggestions
  const aiMatchSuggestions = Array.isArray(aiRaw) ? aiRaw : []
  return {
    description:
      root.description != null ? String(root.description).trim() || null : null,
    status: root.status != null ? String(root.status).trim() || null : null,
    createdAt: root.createdAt != null ? String(root.createdAt) : null,
    jobCategory:
      root.jobCategory != null ? String(root.jobCategory).trim() || null : null,
    company: root.company != null ? String(root.company).trim() || null : null,
    countryCode:
      root.countryCode != null ? String(root.countryCode).trim() || null : null,
    vacancyDepartmentLabel: labelFromMaybeObject(root.vacancyDepartment),
    vacancyModalityLabel: labelFromMaybeObject(root.vacancyModality),
    requirements: root.requirements,
    weights: root.weights ?? null,
    aiMatchSuggestions,
    needsRematch: Boolean(root.needsRematch),
  }
}

export interface VacancyResultadosViewModel {
  vacancyId: string
  title: string | null
  meta: VacancyResultadosVacancyMeta
  applicants: VacancyApplicantLike[]
  kanbanStageNames: string[]
  orderedStageNames: string[]
  companyStatuses: CompanyStatusOption[]
  applicantsByStageFull: ApplicantsByStageFullSection[]
  byStage: StageCountRow[]
  scoreBuckets: ScoreBucketRow[]
  scoreSummary: ScoreSummary
  componentAverages: ComponentScoreAverages
}

/**
 * Carga vacante + etapas y devuelve agregados listos para gráficas.
 * Cuando exista `GET .../vacancies/:id/resultados`, sustituir el cuerpo por esa llamada.
 */
export async function fetchVacancyResultadosPayload(
  vacancyId: string
): Promise<VacancyResultadosViewModel> {
  const vacancyData = await apiClient.get(
    `/api/recruiter/vacancies/${encodeURIComponent(vacancyId)}`
  )
  const vacancyRecord = normalizeVacancyDetailFromApi(vacancyData)
  const directCompanyId = vacancyRecord?.companyId ?? vacancyRecord?.company_id
  if (directCompanyId != null && String(directCompanyId).trim() !== "") {
    persistVacancyCompanyId(vacancyId, String(directCompanyId).trim())
  }

  const companies = await listRecruiterCompanies().catch(() => [])
  const companyId = resolveVacancyCompanyId(vacancyRecord, companies, vacancyId)

  const [stageRows, companyStatuses] = await Promise.all([
    listRecruiterStages(companyId).catch(() => []),
    listCompanyApplicantStatuses(companyId).catch(() => []),
  ])

  const kanbanStageNames = kanbanStageNamesFromApiStages(
    stageRows.map((s) => ({ name: s.name, order: s.order }))
  )
  const applicants = applicantsFromVacancyPayload(vacancyData)
  const title = titleFromVacancyPayload(vacancyData)
  const meta = vacancyMetaFromPayload(vacancyData)
  const orderedStageNames = resolveOrderedStageNames(kanbanStageNames, applicants)

  const byStage = buildStageCounts(applicants, orderedStageNames)
  const applicantsByStageFull = buildApplicantsGroupedByStageFull(
    applicants,
    orderedStageNames
  )
  const scores01 = extractApplicantScores01(applicants)
  const scoreBuckets = buildScorePercentBuckets(scores01)
  const scoreSummary = buildScoreSummary(scores01)
  const componentAverages = buildApplicantComponentScoreAverages(applicants)

  return {
    vacancyId,
    title,
    meta,
    applicants,
    kanbanStageNames,
    orderedStageNames,
    companyStatuses,
    applicantsByStageFull,
    byStage,
    scoreBuckets,
    scoreSummary,
    componentAverages,
  }
}
