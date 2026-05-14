import type {
  CandidateStatusByStageRow,
  PreliminaryMatchScoreRow,
  RecruitmentSourceRow,
  TechnicalEvaluationRow,
  VacancyProgressByClientRow,
} from "@/lib/api/recruiter-reports"
import { mapDefaultCompanyDisplayLabel } from "@/lib/public-company-display"

/** Días sin movimiento para alertar candidatos (heurística demo). */
export const REPORTES_STALE_CANDIDATE_DAYS = 14

/** Días abierta para vacante “lenta” (heurística demo). */
export const REPORTES_SLOW_OPEN_VACANCY_DAYS = 21

function parseIsoDate(value: string | null | undefined): Date | null {
  if (value == null || String(value).trim() === "") return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function diffDaysUtc(from: Date, to: Date): number {
  const a = startOfUtcDay(from).getTime()
  const b = startOfUtcDay(to).getTime()
  return Math.max(0, Math.round((b - a) / 86400000))
}

export function normalizeVacancyStatusSlug(
  slug: string | null | undefined
): "open" | "closed" | "paused" | "draft" | "unknown" {
  if (slug == null || String(slug).trim() === "") return "unknown"
  const k = String(slug).toLowerCase().trim()
  if (k === "open" || k === "abierta" || k === "active") return "open"
  if (k === "closed" || k === "cerrada") return "closed"
  if (k === "paused" || k === "pausada" || k === "pause") return "paused"
  if (k === "draft" || k === "borrador") return "draft"
  return "unknown"
}

export function vacancyClientLabel(row: VacancyProgressByClientRow): string {
  const raw = (row.clientName ?? row.companyName ?? "").trim()
  if (raw === "") return "Sin cliente"
  return mapDefaultCompanyDisplayLabel(raw)
}

export function vacancyProgressPercentValue(
  row: VacancyProgressByClientRow
): number | null {
  const v =
    row.averageApplicationProgressPercent ?? row.progressPercent ?? null
  if (v == null || Number.isNaN(Number(v))) return null
  return Number(v)
}

export function vacancyDaysOpen(row: VacancyProgressByClientRow, now = new Date()): number | null {
  const status = normalizeVacancyStatusSlug(row.vacancyStatus)
  if (status === "closed") return null
  const opened = parseIsoDate(row.openedAt ?? undefined)
  if (!opened) return null
  return diffDaysUtc(opened, now)
}

export type VacancyTrafficLight = "green" | "amber" | "red" | "neutral"

/**
 * Semáforo heurístico hasta que el API envíe un campo explícito de salud.
 */
export function vacancyTrafficLight(
  row: VacancyProgressByClientRow,
  now = new Date()
): VacancyTrafficLight {
  const status = normalizeVacancyStatusSlug(row.vacancyStatus)
  if (status !== "open") return "neutral"
  const n = row.totalCandidates ?? 0
  const days = vacancyDaysOpen(row, now)
  const pct = vacancyProgressPercentValue(row)
  if (n === 0) return "red"
  if (days != null && days >= REPORTES_SLOW_OPEN_VACANCY_DAYS) {
    if (pct != null && pct < 25) return "red"
    if (pct != null && pct < 45) return "amber"
    if (n < 3) return "amber"
  }
  if (days != null && days >= 14 && n < 3) return "amber"
  return "green"
}

export interface VacancyKpiStripModel {
  /** Total de vacantes bajo filtros (totalCount API) cuando se informa; si no, coincide con la página. */
  totalVacancies: number
  vacanciesOnPage: number
  openCount: number
  closedCount: number
  pausedCount: number
  draftCount: number
  totalCandidates: number
  avgProgressPercent: number | null
  avgPreliminaryMatchOnPage: number | null
}

export function computeVacancyProgressKpis(
  rows: readonly VacancyProgressByClientRow[],
  filteredTotalVacancies?: number
): VacancyKpiStripModel {
  let openCount = 0
  let closedCount = 0
  let pausedCount = 0
  let draftCount = 0
  let totalCandidates = 0
  const progressValues: number[] = []
  const preliminaryValues: number[] = []
  for (const r of rows) {
    const s = normalizeVacancyStatusSlug(r.vacancyStatus)
    if (s === "open") openCount += 1
    else if (s === "closed") closedCount += 1
    else if (s === "paused") pausedCount += 1
    else if (s === "draft") draftCount += 1
    const tc = r.totalCandidates
    if (typeof tc === "number" && !Number.isNaN(tc)) totalCandidates += tc
    const p = vacancyProgressPercentValue(r)
    if (p != null) progressValues.push(p)
    const pm = r.averagePreliminaryMatchScore
    if (typeof pm === "number" && !Number.isNaN(pm)) preliminaryValues.push(pm)
  }
  const avgProgressPercent =
    progressValues.length > 0
      ? progressValues.reduce((a, b) => a + b, 0) / progressValues.length
      : null
  const avgPreliminaryMatchOnPage =
    preliminaryValues.length > 0
      ? preliminaryValues.reduce((a, b) => a + b, 0) / preliminaryValues.length
      : null
  return {
    totalVacancies:
      typeof filteredTotalVacancies === "number" &&
      !Number.isNaN(filteredTotalVacancies)
        ? filteredTotalVacancies
        : rows.length,
    vacanciesOnPage: rows.length,
    openCount,
    closedCount,
    pausedCount,
    draftCount,
    totalCandidates,
    avgProgressPercent,
    avgPreliminaryMatchOnPage,
  }
}

export interface VacancyByClientChartRow {
  clientLabel: string
  abiertas: number
  cerradas: number
  pausadas: number
  borradores: number
}

export function aggregateVacancyStatusByClient(
  rows: readonly VacancyProgressByClientRow[]
): VacancyByClientChartRow[] {
  const map = new Map<
    string,
    { abiertas: number; cerradas: number; pausadas: number; borradores: number }
  >()
  for (const r of rows) {
    const label = vacancyClientLabel(r)
    const s = normalizeVacancyStatusSlug(r.vacancyStatus)
    const cur = map.get(label) ?? {
      abiertas: 0,
      cerradas: 0,
      pausadas: 0,
      borradores: 0,
    }
    if (s === "open") cur.abiertas += 1
    else if (s === "closed") cur.cerradas += 1
    else if (s === "paused") cur.pausadas += 1
    else if (s === "draft") cur.borradores += 1
    map.set(label, cur)
  }
  return [...map.entries()]
    .map(([clientLabel, v]) => ({ clientLabel, ...v }))
    .sort((a, b) => a.clientLabel.localeCompare(b.clientLabel, "es"))
}

const STAGE_HINT_INTERVIEW = /interview|entrevista|screening/i
const STAGE_HINT_FINALIST = /final/i
const STAGE_HINT_HIRED = /hired|contrat|seleccion|offer|oferta/i

export function sumCandidatesByStageHints(
  map: Record<string, number> | null | undefined
): { interview: number; finalist: number; hired: number } {
  if (!map || typeof map !== "object") return { interview: 0, finalist: 0, hired: 0 }
  let interview = 0
  let finalist = 0
  let hired = 0
  for (const [key, raw] of Object.entries(map)) {
    const n = typeof raw === "number" && !Number.isNaN(raw) ? raw : 0
    if (STAGE_HINT_INTERVIEW.test(key)) interview += n
    if (STAGE_HINT_FINALIST.test(key)) finalist += n
    if (STAGE_HINT_HIRED.test(key)) hired += n
  }
  return { interview, finalist, hired }
}

export function parseTechnicalScorePercent(
  row: TechnicalEvaluationRow
): number | null {
  const blob = `${row.scoreOrOutcome ?? ""} ${row.status ?? ""} ${row.outcome ?? ""}`
  const m = blob.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/)
  if (m) {
    const v = Number.parseFloat(m[1].replace(",", "."))
    if (!Number.isNaN(v) && v >= 0 && v <= 100) return v
  }
  const m2 = blob.match(/\b(\d{1,3}(?:[.,]\d+)?)\s*\/\s*100\b/)
  if (m2) {
    const v = Number.parseFloat(m2[1].replace(",", "."))
    if (!Number.isNaN(v) && v >= 0 && v <= 100) return v
  }
  return null
}

export type TechnicalEvalBucket = "approved" | "review" | "failed" | "pending"

export function technicalEvaluationBucket(row: TechnicalEvaluationRow): TechnicalEvalBucket {
  const t = `${row.outcome ?? ""} ${row.status ?? ""} ${row.scoreOrOutcome ?? ""}`.toLowerCase()
  if (/pend|in progress|enviad|sin |pending|draft/.test(t)) return "pending"
  if (/aprob|pass|approved|apt/.test(t)) return "approved"
  if (/reprob|fail|no apt|descart|reject/.test(t)) return "failed"
  if (/revis|review|moderad|border/.test(t)) return "review"
  if (t.trim() === "") return "pending"
  return "review"
}

export interface TechnicalEvalKpis {
  /** totalCount del API si hay paginación; si no, filas en página. */
  totalUnderFilter: number
  rowsOnPage: number
  approved: number
  review: number
  failed: number
  pending: number
  avgScore: number | null
  withNumericScore: number
}

export function computeTechnicalEvaluationKpis(
  rows: readonly TechnicalEvaluationRow[],
  filteredTotal?: number
): TechnicalEvalKpis {
  let approved = 0
  let review = 0
  let failed = 0
  let pending = 0
  const scores: number[] = []
  for (const r of rows) {
    const b = technicalEvaluationBucket(r)
    if (b === "approved") approved += 1
    else if (b === "review") review += 1
    else if (b === "failed") failed += 1
    else pending += 1
    const sc = parseTechnicalScorePercent(r)
    if (sc != null) scores.push(sc)
  }
  const totalUnderFilter =
    typeof filteredTotal === "number" && !Number.isNaN(filteredTotal)
      ? filteredTotal
      : rows.length
  return {
    totalUnderFilter,
    rowsOnPage: rows.length,
    approved,
    review,
    failed,
    pending,
    avgScore:
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null,
    withNumericScore: scores.length,
  }
}

/** Score preliminar 0–100 en fila de detalle. */
export function preliminaryMatchScoreValue(
  row: PreliminaryMatchScoreRow
): number | null {
  const v = row.score ?? row.preliminaryMatchScore
  if (v == null || Number.isNaN(Number(v))) return null
  const n = Number(v)
  if (n < 0 || n > 100) return null
  return n
}

export interface RecruitmentSourcesKpis {
  totalCandidates: number
  totalHires: number
  sourcesCount: number
  avgConversionPercent: number | null
}

export function computeRecruitmentSourcesKpis(
  rows: readonly RecruitmentSourceRow[]
): RecruitmentSourcesKpis {
  let totalCandidates = 0
  let totalHires = 0
  const conv: number[] = []
  for (const r of rows) {
    const c = r.candidatesCount
    const h = r.hiresCount
    if (typeof c === "number" && !Number.isNaN(c)) totalCandidates += c
    if (typeof h === "number" && !Number.isNaN(h)) totalHires += h
    const p = r.conversionPercent
    if (typeof p === "number" && !Number.isNaN(p)) conv.push(p)
  }
  return {
    totalCandidates,
    totalHires,
    sourcesCount: rows.length,
    avgConversionPercent:
      conv.length > 0 ? conv.reduce((a, b) => a + b, 0) / conv.length : null,
  }
}

export function candidateStageLabel(row: CandidateStatusByStageRow): string {
  return (row.currentStageName ?? row.stageName ?? "Sin etapa").trim() || "Sin etapa"
}

export interface CandidatePageStageCount {
  stageName: string
  count: number
}

export function countCandidatesByStageOnPage(
  rows: readonly CandidateStatusByStageRow[]
): CandidatePageStageCount[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const name = candidateStageLabel(r)
    map.set(name, (map.get(name) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([stageName, count]) => ({ stageName, count }))
    .sort((a, b) => b.count - a.count || a.stageName.localeCompare(b.stageName, "es"))
}

export function candidateDaysSinceLastMove(
  row: CandidateStatusByStageRow,
  now = new Date()
): number | null {
  const d = parseIsoDate(row.lastMovedAt ?? undefined)
  if (!d) return null
  return diffDaysUtc(d, now)
}
