import { apiClient } from "@/lib/api"
import {
  buildApplicantsGroupedByStage,
  buildScorePercentBuckets,
  buildScoreSummary,
  buildStageCounts,
  extractApplicantScores01,
  type ApplicantsByStageSection,
  type CompanyStatusOption,
  type ScoreBucketRow,
  type ScoreSummary,
  type StageCountRow,
  type VacancyApplicantLike,
} from "@/lib/rrhh/vacancy-pipeline-stats"

const RECRUITER_COMPANY_ID = "00000000-0000-0000-0000-000000000001"

function parseStagesResponse(data: unknown): { name: string; order: number }[] {
  const root = data as Record<string, unknown> | null | undefined
  const list = Array.isArray(data)
    ? data
    : Array.isArray(root?.stages)
      ? root.stages
      : Array.isArray(root?.items)
        ? root.items
        : Array.isArray(root?.data)
          ? root.data
          : []
  return (list as Record<string, unknown>[]).map((item, i) => ({
    name: String(item?.name ?? item?.stage_name ?? "").trim(),
    order: Number(item?.orderIndex ?? item?.order ?? i) || i,
  }))
}

function kanbanStageNamesFromApiStages(
  stages: { name: string; order: number }[]
): string[] {
  const sorted = [...stages].sort((a, b) => a.order - b.order)
  return sorted.map((s) => s.name).filter((n) => n !== "")
}

function parseStatusesResponse(data: unknown): CompanyStatusOption[] {
  const root = data as Record<string, unknown> | null | undefined
  const list = Array.isArray(data)
    ? data
    : Array.isArray(root?.statuses)
      ? root.statuses
      : Array.isArray(root?.items)
        ? root.items
        : Array.isArray(root?.data)
          ? root.data
          : []
  return (list as Record<string, unknown>[]).map((item, i) => ({
    id: String(item?.id ?? item?.uuid ?? i),
    name: String(item?.name ?? item?.status_name ?? "").trim() || `Estado ${i + 1}`,
  }))
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

export interface VacancyResultadosViewModel {
  vacancyId: string
  title: string | null
  applicants: VacancyApplicantLike[]
  kanbanStageNames: string[]
  companyStatuses: CompanyStatusOption[]
  applicantsByStage: ApplicantsByStageSection[]
  byStage: StageCountRow[]
  scoreBuckets: ScoreBucketRow[]
  scoreSummary: ScoreSummary
}

/**
 * Carga vacante + etapas y devuelve agregados listos para gráficas.
 * Cuando exista `GET .../vacancies/:id/resultados`, sustituir el cuerpo por esa llamada.
 */
export async function fetchVacancyResultadosPayload(
  vacancyId: string
): Promise<VacancyResultadosViewModel> {
  const [vacancyData, stagesData, statusesData] = await Promise.all([
    apiClient.get(`/api/recruiter/vacancies/${encodeURIComponent(vacancyId)}`),
    apiClient.get(
      `/api/recruiter/companies/${RECRUITER_COMPANY_ID}/stages`
    ),
    apiClient.get(
      `/api/recruiter/companies/${RECRUITER_COMPANY_ID}/statuses`
    ),
  ])

  const stageRows = parseStagesResponse(stagesData)
  const kanbanStageNames = kanbanStageNamesFromApiStages(stageRows)
  const companyStatuses = parseStatusesResponse(statusesData)
  const applicants = applicantsFromVacancyPayload(vacancyData)
  const title = titleFromVacancyPayload(vacancyData)

  const byStage = buildStageCounts(applicants, kanbanStageNames)
  const applicantsByStage = buildApplicantsGroupedByStage(
    applicants,
    kanbanStageNames,
    companyStatuses
  )
  const scores01 = extractApplicantScores01(applicants)
  const scoreBuckets = buildScorePercentBuckets(scores01)
  const scoreSummary = buildScoreSummary(scores01)

  return {
    vacancyId,
    title,
    applicants,
    kanbanStageNames,
    companyStatuses,
    applicantsByStage,
    byStage,
    scoreBuckets,
    scoreSummary,
  }
}
