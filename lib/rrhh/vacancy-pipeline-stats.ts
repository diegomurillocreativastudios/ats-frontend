/** Postulante tal como viene en `vacancy.applicants` (Kanban). */
export interface VacancyApplicantLike {
  applicationStage?: string | null
  stage?: string | null
  semanticScore?: number | null
  totalScore?: number | null
  componentScores?: Record<string, unknown> | null
  qualitativeReasoningPositive?: string | null
  qualitative_reasoning_positive?: string | null
  qualitativeReasoningNegative?: string | null
  qualitative_reasoning_negative?: string | null
  candidateDocumentId?: string | null
  candidateProfileId?: string | null
  id?: string | null
  name?: string | null
  fullName?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
  uploadedAt?: string | null
  applicationId?: string | null
  applicationStageId?: string | null
  applicationSource?: number | null
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

export interface ApplicantsByStageFullSection {
  stageName: string
  applicants: VacancyApplicantLike[]
}

/**
 * Last-resort column names when the global catalog and applicants are both empty.
 * Prefer locale-specific names from i18n (`fallbackKanbanStages`).
 */
export const FALLBACK_KANBAN_STAGES = [
  "Sourced",
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
] as const

/**
 * Reads locale-specific last-resort column names from i18n (`fallbackKanbanStages`).
 * Falls back to `FALLBACK_KANBAN_STAGES` when the payload is missing or empty.
 */
export function parseFallbackKanbanStages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...FALLBACK_KANBAN_STAGES]
  const names = raw
    .map((item) => String(item ?? "").trim())
    .filter((name) => name !== "")
  return names.length > 0 ? names : [...FALLBACK_KANBAN_STAGES]
}

/**
 * Orden de etapas del tablero + etapas que aparecen en postulantes pero no estaban en el catálogo (al final).
 * If the global catalog is empty, applicant stage names are used instead of inventing English columns.
 */
export function resolveOrderedStageNames(
  kanbanStageNames: readonly string[],
  applicants: VacancyApplicantLike[],
  fallbackStageNames: readonly string[] = FALLBACK_KANBAN_STAGES
): string[] {
  const base: string[] = []
  const seen = new Set<string>()
  const catalog = kanbanStageNames
    .map((stage) => String(stage).trim())
    .filter(Boolean)
  const fallback = [...fallbackStageNames]
    .map((stage) => String(stage).trim())
    .filter(Boolean)

  const addName = (raw: string) => {
    const key = raw.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    base.push(raw)
  }

  for (const raw of catalog) addName(raw)
  for (const match of applicants) {
    const raw = String(match.applicationStage ?? match.stage ?? "").trim()
    if (!raw) continue
    addName(raw)
  }
  if (base.length === 0) {
    for (const raw of fallback) addName(raw)
  }
  return base
}

export function normalizeKanbanStage(
  value: unknown,
  stageNames: readonly string[] = FALLBACK_KANBAN_STAGES
): string {
  const names =
    stageNames.length > 0 ? [...stageNames] : [...FALLBACK_KANBAN_STAGES]
  if (!names.length) return FALLBACK_KANBAN_STAGES[0]
  if (value == null || String(value).trim() === "") return names[0]
  const trimmed = String(value).trim()
  const key = trimmed.toLowerCase()
  const found = names.find((s) => s.toLowerCase() === key)
  return found ?? trimmed
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
  kanbanStageNames: readonly string[]
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

export function pickApplicantDisplayName(match: VacancyApplicantLike, index: number): string {
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
 * Agrupa postulantes por etapa conservando el objeto original (para UI detallada).
 * `stageNamesOrdered` debe incluir todas las etapas posibles (p. ej. `resolveOrderedStageNames`).
 */
export function buildApplicantsGroupedByStageFull(
  applicants: VacancyApplicantLike[],
  stageNamesOrdered: readonly string[]
): ApplicantsByStageFullSection[] {
  const names =
    stageNamesOrdered.length > 0 ? stageNamesOrdered : [...FALLBACK_KANBAN_STAGES]
  const sections: ApplicantsByStageFullSection[] = names.map((stageName) => ({
    stageName,
    applicants: [],
  }))
  const indexByStage = new Map(names.map((n, i) => [n, i]))

  applicants.forEach((match) => {
    const stage = normalizeKanbanStage(
      match.applicationStage ?? match.stage,
      names
    )
    const idx = indexByStage.get(stage) ?? 0
    sections[idx].applicants.push(match)
  })

  for (const sec of sections) {
    sec.applicants.sort((a, b) => {
      const sa = getApplicantPrimaryScore01(a)
      const sb = getApplicantPrimaryScore01(b)
      const pa = sa != null ? sa * 100 : null
      const pb = sb != null ? sb * 100 : null
      if (pa != null && pb != null && pa !== pb) return pb - pa
      if (pa != null && pb == null) return -1
      if (pa == null && pb != null) return 1
      return pickApplicantDisplayName(a, 0).localeCompare(
        pickApplicantDisplayName(b, 0),
        "es",
        { sensitivity: "base" }
      )
    })
  }
  return sections
}

/**
 * Agrupa postulantes por etapa normalizada con nombre, % puntaje y estado.
 */
export function buildApplicantsGroupedByStage(
  applicants: VacancyApplicantLike[],
  kanbanStageNames: readonly string[],
  statuses: CompanyStatusOption[]
): ApplicantsByStageSection[] {
  const ordered = resolveOrderedStageNames(kanbanStageNames, applicants)
  const full = buildApplicantsGroupedByStageFull(applicants, ordered)
  return full.map((sec) => ({
    stageName: sec.stageName,
    applicants: sec.applicants.map((match, index) => {
      const stage = normalizeKanbanStage(
        match.applicationStage ?? match.stage,
        ordered
      )
      const s01 = getApplicantPrimaryScore01(match)
      const scorePercent = s01 != null ? s01 * 100 : null
      return {
        candidateId: getCandidateId(match, index),
        displayName: pickApplicantDisplayName(match, index),
        scorePercent,
        statusLabel: resolveApplicationStatusLabel(match, statuses, stage),
      }
    }),
  }))
}

function pickNumeric01(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return value
}

export interface ApplicantComponentScores01 {
  qualitative: number | null
  vector: number | null
  attributeAggregate: number | null
}

export function extractApplicantComponentScores01(
  match: VacancyApplicantLike
): ApplicantComponentScores01 {
  const raw = match.componentScores
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { qualitative: null, vector: null, attributeAggregate: null }
  }
  const o = raw as Record<string, unknown>
  return {
    qualitative: pickNumeric01(o.QualitativeScore ?? o.qualitativeScore),
    vector: pickNumeric01(o.VectorSimilarity ?? o.vectorSimilarity),
    attributeAggregate: pickNumeric01(
      o.attribute_aggregate ?? o.attributeAggregate
    ),
  }
}

export interface ComponentScoreAverages {
  qualitativeMean01: number | null
  vectorMean01: number | null
  attributeMean01: number | null
  samplesWithAnyComponent: number
}

export function buildApplicantComponentScoreAverages(
  applicants: VacancyApplicantLike[]
): ComponentScoreAverages {
  let nq = 0
  let nv = 0
  let na = 0
  let sq = 0
  let sv = 0
  let sa = 0
  let samplesWithAnyComponent = 0
  for (const m of applicants) {
    const c = extractApplicantComponentScores01(m)
    const any =
      c.qualitative != null || c.vector != null || c.attributeAggregate != null
    if (!any) continue
    samplesWithAnyComponent += 1
    if (c.qualitative != null) {
      nq += 1
      sq += c.qualitative
    }
    if (c.vector != null) {
      nv += 1
      sv += c.vector
    }
    if (c.attributeAggregate != null) {
      na += 1
      sa += c.attributeAggregate
    }
  }
  return {
    qualitativeMean01: nq > 0 ? sq / nq : null,
    vectorMean01: nv > 0 ? sv / nv : null,
    attributeMean01: na > 0 ? sa / na : null,
    samplesWithAnyComponent,
  }
}
