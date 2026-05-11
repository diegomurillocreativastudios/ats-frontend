/** Postulante tal como viene en `vacancy.applicants` (Kanban). */
export interface VacancyApplicantLike {
  applicationStage?: string | null
  stage?: string | null
  semanticScore?: number | null
  totalScore?: number | null
  candidateDocumentId?: string | null
  candidateProfileId?: string | null
  id?: string | null
  name?: string | null
  fullName?: string | null
  full_name?: string | null
  email?: string | null
  applicationStatusId?: string | null
  application_status_id?: string | null
  statusId?: string | null
  status_id?: string | null
  applicationStatus?: string | null
  status?: string | null
  applicationStatusDisplayName?: string | null
  application_status_display_name?: string | null
}

/** Catálogo de estados de postulación (empresa), mismo criterio que el Kanban. */
export interface CompanyStatusOption {
  id: string
  name: string
}

export interface ApplicantResultadosRow {
  candidateId: string
  displayName: string
  scorePercent: number | null
  statusLabel: string
}

export interface ApplicantsByStageSection {
  stageName: string
  applicants: ApplicantResultadosRow[]
}

export const FALLBACK_KANBAN_STAGES = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
] as const

export function normalizeKanbanStage(
  value: unknown,
  stageNames: readonly string[] = FALLBACK_KANBAN_STAGES
): string {
  if (!stageNames?.length) return FALLBACK_KANBAN_STAGES[0]
  if (value == null || String(value).trim() === "") return stageNames[0]
  const key = String(value).trim().toLowerCase()
  const found = stageNames.find((s) => s.toLowerCase() === key)
  return found ?? stageNames[0]
}

export function getCandidateId(match: VacancyApplicantLike, index: number): string {
  return (
    match.candidateDocumentId ??
    match.candidateProfileId ??
    match?.id ??
    `candidate-${index}`
  )
}

/** Puntaje principal alineado con Kanban: 0–1 o null si no aplica. */
export function getApplicantPrimaryScore01(match: VacancyApplicantLike): number | null {
  const raw = match.semanticScore ?? match.totalScore
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null
  return raw
}

export interface StageCountRow {
  stageName: string
  count: number
}

/**
 * Cuenta postulantes por etapa (nombres en `kanbanStageNames`, orden fijo).
 */
export function buildStageCounts(
  applicants: VacancyApplicantLike[],
  kanbanStageNames: string[]
): StageCountRow[] {
  const names =
    kanbanStageNames.length > 0 ? kanbanStageNames : [...FALLBACK_KANBAN_STAGES]
  const counts = new Map<string, number>()
  for (const s of names) counts.set(s, 0)
  for (const match of applicants) {
    const stage = normalizeKanbanStage(
      match.applicationStage ?? match.stage,
      names
    )
    counts.set(stage, (counts.get(stage) ?? 0) + 1)
  }
  return names.map((stageName) => ({
    stageName,
    count: counts.get(stageName) ?? 0,
  }))
}

export function extractApplicantScores01(
  applicants: VacancyApplicantLike[]
): number[] {
  const out: number[] = []
  for (const m of applicants) {
    const s = getApplicantPrimaryScore01(m)
    if (s != null) out.push(s)
  }
  return out
}

export interface ScoreBucketRow {
  label: string
  count: number
}

const DEFAULT_PERCENT_BIN_LABELS = ["0–20", "20–40", "40–60", "60–80", "80–100"]

/**
 * Histograma de puntajes en porcentaje (0–100), bins de 20 puntos.
 */
export function buildScorePercentBuckets(
  scores01: number[],
  binWidthPercent = 20
): ScoreBucketRow[] {
  const n = Math.max(1, Math.round(100 / binWidthPercent))
  const buckets: ScoreBucketRow[] = []
  for (let i = 0; i < n; i++) {
    const lo = i * binWidthPercent
    const hi = i === n - 1 ? 100 : (i + 1) * binWidthPercent
    const label =
      DEFAULT_PERCENT_BIN_LABELS[i] ?? `${lo}–${hi}`
    buckets.push({ label, count: 0 })
  }
  for (const s01 of scores01) {
    const pct = Math.min(100, Math.max(0, s01 * 100))
    const idx = Math.min(
      n - 1,
      Math.floor(pct / binWidthPercent)
    )
    buckets[idx].count += 1
  }
  return buckets
}

export interface ScoreSummary {
  count: number
  meanPercent: number | null
  minPercent: number | null
  maxPercent: number | null
}

export function buildScoreSummary(scores01: number[]): ScoreSummary {
  if (scores01.length === 0) {
    return {
      count: 0,
      meanPercent: null,
      minPercent: null,
      maxPercent: null,
    }
  }
  const percents = scores01.map((s) => s * 100)
  const sum = percents.reduce((a, b) => a + b, 0)
  return {
    count: scores01.length,
    meanPercent: sum / percents.length,
    minPercent: Math.min(...percents),
    maxPercent: Math.max(...percents),
  }
}

function pickApplicantDisplayName(match: VacancyApplicantLike, index: number): string {
  const n =
    match.name ??
    match.fullName ??
    match.full_name
  if (n != null && String(n).trim() !== "") return String(n).trim()
  const id =
    match.candidateProfileId ?? match.candidateDocumentId ?? match.id
  if (id != null && String(id).trim() !== "") {
    const short = String(id).trim()
    return short.length > 12 ? `Candidato (${short.slice(0, 8)}…)` : `Candidato (${short})`
  }
  return `Candidato ${index + 1}`
}

/**
 * Etiqueta de estado de postulación alineada con `getCurrentStatusId` del Kanban (sin overrides locales).
 */
export function resolveApplicationStatusLabel(
  match: VacancyApplicantLike,
  statuses: CompanyStatusOption[],
  stageColumnName: string
): string {
  const display =
    match.applicationStatusDisplayName ??
    match.application_status_display_name
  if (display != null && String(display).trim() !== "") {
    return String(display).trim()
  }
  const rawStatus = match.applicationStatus ?? match.status
  const statusId =
    match.applicationStatusId ??
    match.application_status_id ??
    match.statusId ??
    match.status_id ??
    statuses.find(
      (s) =>
        (s.name || "").trim().toLowerCase() ===
        String(rawStatus ?? stageColumnName ?? "")
          .trim()
          .toLowerCase()
    )?.id
  if (statusId != null && String(statusId).trim() !== "") {
    const found = statuses.find((s) => s.id === String(statusId))
    if (found?.name) return found.name
  }
  if (rawStatus != null && String(rawStatus).trim() !== "") {
    return String(rawStatus).trim()
  }
  return statuses[0]?.name?.trim() || "—"
}

/**
 * Agrupa postulantes por etapa normalizada con nombre, % puntaje y estado.
 */
export function buildApplicantsGroupedByStage(
  applicants: VacancyApplicantLike[],
  kanbanStageNames: string[],
  statuses: CompanyStatusOption[]
): ApplicantsByStageSection[] {
  const names =
    kanbanStageNames.length > 0 ? kanbanStageNames : [...FALLBACK_KANBAN_STAGES]
  const sections: ApplicantsByStageSection[] = names.map((stageName) => ({
    stageName,
    applicants: [],
  }))
  const indexByStage = new Map(names.map((n, i) => [n, i]))

  applicants.forEach((match, index) => {
    const stage = normalizeKanbanStage(
      match.applicationStage ?? match.stage,
      names
    )
    const idx = indexByStage.get(stage) ?? 0
    const s01 = getApplicantPrimaryScore01(match)
    const scorePercent = s01 != null ? s01 * 100 : null
    sections[idx].applicants.push({
      candidateId: getCandidateId(match, index),
      displayName: pickApplicantDisplayName(match, index),
      scorePercent,
      statusLabel: resolveApplicationStatusLabel(match, statuses, stage),
    })
  })

  for (const sec of sections) {
    sec.applicants.sort((a, b) => {
      const sa = a.scorePercent
      const sb = b.scorePercent
      if (sa != null && sb != null && sa !== sb) return sb - sa
      if (sa != null && sb == null) return -1
      if (sa == null && sb != null) return 1
      return a.displayName.localeCompare(b.displayName, "es", {
        sensitivity: "base",
      })
    })
  }
  return sections
}
