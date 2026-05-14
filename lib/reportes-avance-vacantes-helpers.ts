import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import { formatPercent, formatReportDateOnly } from "@/lib/reportes-display"
import {
  aggregateVacancyStatusByClient,
  computeVacancyProgressKpis,
  normalizeVacancyStatusSlug,
  vacancyClientLabel,
  vacancyDaysOpenForDisplay,
  vacancyProgressPercentValue,
  vacancyStageCounts,
  type VacancyByClientChartRow,
  type VacancyKpiStripModel,
} from "@/lib/reportes-metrics"

export type VacancyHealthLevel = "critica" | "atencion" | "saludable" | "nueva" | "neutral"

export interface AvanceVacantesDashboardKpis extends VacancyKpiStripModel {
  sumInterview: number
  sumFinalist: number
  sumHired: number
  sumPreliminaryAnalyzed: number
}

export function formatDate(value: string | null | undefined): string {
  return formatReportDateOnly(value)
}

export function getAverage(values: readonly (number | null | undefined)[]): number | null {
  const nums = values.filter(
    (v): v is number => typeof v === "number" && !Number.isNaN(v)
  )
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function getDaysOpen(
  row: VacancyProgressByClientRow,
  now = new Date()
): number | null {
  return vacancyDaysOpenForDisplay(row, now)
}

export function getAiCoverage(row: VacancyProgressByClientRow): {
  ratio: number | null
  percentDisplay: string
  analyzed: number
  total: number
} {
  const total = typeof row.totalCandidates === "number" ? row.totalCandidates : 0
  const analyzedRaw = row.candidatesWithPreliminaryAnalysis
  const analyzed =
    typeof analyzedRaw === "number" && !Number.isNaN(analyzedRaw) ? analyzedRaw : 0
  if (total <= 0) {
    return { ratio: null, percentDisplay: "Sin candidatos", analyzed, total }
  }
  const ratio = analyzed / total
  return {
    ratio,
    percentDisplay: formatPercent(ratio * 100),
    analyzed,
    total,
  }
}

export function getVacancyHealth(
  row: VacancyProgressByClientRow,
  now = new Date()
): VacancyHealthLevel {
  const days = vacancyDaysOpenForDisplay(row, now)
  const total = row.totalCandidates ?? 0
  const pct = vacancyProgressPercentValue(row)
  const matchRaw = row.averagePreliminaryMatchScore
  const matchNum =
    typeof matchRaw === "number" && !Number.isNaN(matchRaw) ? matchRaw : null
  const status = normalizeVacancyStatusSlug(row.vacancyStatus)

  const isPctEmpty = pct == null || pct === 0
  const criticalA = total === 0 && days != null && days > 10
  const criticalB = isPctEmpty && days != null && days > 10
  if (criticalA || criticalB) return "critica"

  const atencion =
    (pct != null && pct < 30) || (matchNum != null && matchNum < 50)
  if (atencion) return "atencion"

  const saludable =
    (pct != null && pct >= 50) || (matchNum != null && matchNum >= 70)
  if (saludable) return "saludable"

  if (status === "open" && days != null && days <= 7) return "nueva"

  return "neutral"
}

export function vacancyHealthLabel(level: VacancyHealthLevel): string {
  const map: Record<VacancyHealthLevel, string> = {
    critica: "Crítica",
    atencion: "Atención",
    saludable: "Saludable",
    nueva: "Nueva",
    neutral: "Sin señal",
  }
  return map[level]
}

export function vacancyHealthBadgeClass(level: VacancyHealthLevel): string {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 font-sans text-xs font-medium tabular-nums"
  const map: Record<VacancyHealthLevel, string> = {
    critica: `${base} border-red-200 bg-red-50 text-red-800`,
    atencion: `${base} border-amber-200 bg-amber-50 text-amber-900`,
    saludable: `${base} border-emerald-200 bg-emerald-50 text-emerald-900`,
    nueva: `${base} border-sky-200 bg-sky-50 text-sky-900`,
    neutral: `${base} border-border bg-muted/60 text-muted-foreground`,
  }
  return map[level]
}

export function computeAvanceVacantesDashboardKpis(
  rows: readonly VacancyProgressByClientRow[],
  totalCount: number
): AvanceVacantesDashboardKpis {
  const base = computeVacancyProgressKpis(rows, totalCount)
  let sumInterview = 0
  let sumFinalist = 0
  let sumHired = 0
  let sumPreliminaryAnalyzed = 0
  for (const r of rows) {
    const sc = vacancyStageCounts(r)
    if (typeof sc.interview === "number") sumInterview += sc.interview
    if (typeof sc.finalist === "number") sumFinalist += sc.finalist
    if (typeof sc.hired === "number") sumHired += sc.hired
    const pre = r.candidatesWithPreliminaryAnalysis
    if (typeof pre === "number" && !Number.isNaN(pre)) sumPreliminaryAnalyzed += pre
  }
  return {
    ...base,
    sumInterview,
    sumFinalist,
    sumHired,
    sumPreliminaryAnalyzed,
  }
}

export interface ProgressBarChartRow {
  vacancyKey: string
  vacancyTitle: string
  clientLabel: string
  progressPercent: number
  totalCandidates: number
  matchAvg: number | null
}

export function buildProgressByVacancyChartRows(
  rows: readonly VacancyProgressByClientRow[]
): ProgressBarChartRow[] {
  const list: ProgressBarChartRow[] = []
  for (const r of rows) {
    const p = vacancyProgressPercentValue(r)
    if (p == null || Number.isNaN(p)) continue
    const title = (r.vacancyTitle ?? "Sin título").trim() || "Sin título"
    const key = String(r.vacancyId ?? title)
    const matchRaw = r.averagePreliminaryMatchScore
    const matchAvg =
      typeof matchRaw === "number" && !Number.isNaN(matchRaw) ? matchRaw : null
    list.push({
      vacancyKey: key,
      vacancyTitle: title.length > 42 ? `${title.slice(0, 40)}…` : title,
      clientLabel: vacancyClientLabel(r),
      progressPercent: p,
      totalCandidates: typeof r.totalCandidates === "number" ? r.totalCandidates : 0,
      matchAvg,
    })
  }
  return list.sort((a, b) => b.progressPercent - a.progressPercent)
}

export interface CandidatesBarChartRow {
  vacancyKey: string
  vacancyTitle: string
  totalCandidates: number
  isZero: boolean
  interview: number | null
  finalist: number | null
  hired: number | null
}

export function buildCandidatesByVacancyChartRows(
  rows: readonly VacancyProgressByClientRow[]
): CandidatesBarChartRow[] {
  return [...rows]
    .map((r) => {
      const title = (r.vacancyTitle ?? "Sin título").trim() || "Sin título"
      const key = String(r.vacancyId ?? title)
      const total = typeof r.totalCandidates === "number" ? r.totalCandidates : 0
      const sc = vacancyStageCounts(r)
      return {
        vacancyKey: key,
        vacancyTitle: title.length > 42 ? `${title.slice(0, 40)}…` : title,
        totalCandidates: total,
        isZero: total === 0,
        interview: sc.interview,
        finalist: sc.finalist,
        hired: sc.hired,
      }
    })
    .sort((a, b) => b.totalCandidates - a.totalCandidates)
}

const DONUT_COLORS: Record<string, string> = {
  open: "#6E3385",
  closed: "#496FB3",
  paused: "#CA8A04",
  draft: "#94A3B8",
  unknown: "#A1A1AA",
}

export interface StatusDonutSlice {
  name: string
  value: number
  fill: string
  key: string
}

export function buildVacancyStatusDonutData(
  rows: readonly VacancyProgressByClientRow[]
): StatusDonutSlice[] {
  const map = new Map<string, { label: string; count: number }>()
  for (const r of rows) {
    const slug = normalizeVacancyStatusSlug(r.vacancyStatus)
    const key = slug === "unknown" ? "unknown" : slug
    const label =
      slug === "open"
        ? "Abiertas"
        : slug === "closed"
          ? "Cerradas"
          : slug === "paused"
            ? "Pausadas"
            : slug === "draft"
              ? "Borradores"
              : "Otros"
    const cur = map.get(key) ?? { label, count: 0 }
    cur.count += 1
    map.set(key, cur)
  }
  return [...map.entries()].map(([k, v]) => ({
    key: k,
    name: v.label,
    value: v.count,
    fill: DONUT_COLORS[k] ?? DONUT_COLORS.unknown,
  }))
}

export function aggregateAiCoverageTotals(
  rows: readonly VacancyProgressByClientRow[]
): { analyzed: number; total: number; percentDisplay: string } {
  let analyzed = 0
  let total = 0
  for (const r of rows) {
    const t = r.totalCandidates
    const a = r.candidatesWithPreliminaryAnalysis
    if (typeof t === "number" && !Number.isNaN(t)) total += t
    if (typeof a === "number" && !Number.isNaN(a)) analyzed += a
  }
  if (total <= 0) {
    return { analyzed, total, percentDisplay: "Sin candidatos" }
  }
  return {
    analyzed,
    total,
    percentDisplay: formatPercent((analyzed / total) * 100),
  }
}

export interface ExecutiveInsight {
  id: string
  title: string
  description: string
  metric: string
  isEmpty: boolean
}

export function buildExecutiveInsights(
  rows: readonly VacancyProgressByClientRow[]
): ExecutiveInsight[] {
  if (rows.length === 0) {
    return [
      {
        id: "max-progress",
        title: "Vacante con mayor avance",
        description: "Sin datos en esta página.",
        metric: "—",
        isEmpty: true,
      },
      {
        id: "best-match",
        title: "Vacante con mejor match IA",
        description: "Sin datos en esta página.",
        metric: "—",
        isEmpty: true,
      },
      {
        id: "most-candidates",
        title: "Vacante con más candidatos",
        description: "Sin datos en esta página.",
        metric: "—",
        isEmpty: true,
      },
      {
        id: "zero-candidates",
        title: "Vacantes sin candidatos",
        description: "Sin filas para analizar.",
        metric: "—",
        isEmpty: true,
      },
    ]
  }

  const withProgress = rows
    .map((r) => ({ r, p: vacancyProgressPercentValue(r) }))
    .filter((x): x is { r: VacancyProgressByClientRow; p: number } => x.p != null)
  const bestProgress = withProgress.sort((a, b) => b.p - a.p)[0]

  const withMatch = rows
    .map((r) => ({
      r,
      m:
        typeof r.averagePreliminaryMatchScore === "number" &&
        !Number.isNaN(r.averagePreliminaryMatchScore)
          ? r.averagePreliminaryMatchScore
          : null,
    }))
    .filter((x): x is { r: VacancyProgressByClientRow; m: number } => x.m != null)
  const bestMatch = withMatch.sort((a, b) => b.m - a.m)[0]

  const withTotals = rows.map((r) => ({
    r,
    t: typeof r.totalCandidates === "number" ? r.totalCandidates : 0,
  }))
  const mostCand = [...withTotals].sort((a, b) => b.t - a.t)[0]

  const zeroCount = rows.filter(
    (r) => (typeof r.totalCandidates === "number" ? r.totalCandidates : 0) === 0
  ).length

  return [
    {
      id: "max-progress",
      title: "Vacante con mayor avance",
      description: bestProgress
        ? `${vacancyClientLabel(bestProgress.r)} · ${bestProgress.r.vacancyTitle ?? "—"}`
        : "Ninguna vacante tiene % de avance informado.",
      metric: bestProgress ? formatPercent(bestProgress.p) : "—",
      isEmpty: !bestProgress,
    },
    {
      id: "best-match",
      title: "Vacante con mejor match IA",
      description: bestMatch
        ? `${vacancyClientLabel(bestMatch.r)} · ${bestMatch.r.vacancyTitle ?? "—"}`
        : "Ninguna vacante tiene match IA promedio.",
      metric: bestMatch ? `${Math.round(bestMatch.m)}%` : "—",
      isEmpty: !bestMatch,
    },
    {
      id: "most-candidates",
      title: "Vacante con más candidatos",
      description: mostCand
        ? `${vacancyClientLabel(mostCand.r)} · ${mostCand.r.vacancyTitle ?? "—"}`
        : "—",
      metric: String(mostCand?.t ?? 0),
      isEmpty: false,
    },
    {
      id: "zero-candidates",
      title: "Vacantes sin candidatos",
      description:
        zeroCount > 0
          ? "Revisá priorización o canales de captación."
          : "Todas las vacantes de esta página tienen al menos un candidato.",
      metric: `${zeroCount}`,
      isEmpty: zeroCount === 0,
    },
  ]
}

const HEALTH_ORDER: Record<VacancyHealthLevel, number> = {
  critica: 0,
  atencion: 1,
  neutral: 2,
  nueva: 3,
  saludable: 4,
}

export function sortRowsForTrafficLight(
  rows: readonly VacancyProgressByClientRow[],
  now = new Date()
): Array<{ row: VacancyProgressByClientRow; health: VacancyHealthLevel }> {
  return [...rows]
    .map((row) => ({ row, health: getVacancyHealth(row, now) }))
    .sort((a, b) => {
      const d = HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health]
      if (d !== 0) return d
      const ta = vacancyClientLabel(a.row).localeCompare(
        vacancyClientLabel(b.row),
        "es"
      )
      if (ta !== 0) return ta
      return String(a.row.vacancyTitle ?? "").localeCompare(
        String(b.row.vacancyTitle ?? ""),
        "es"
      )
    })
}

export { aggregateVacancyStatusByClient, formatPercent, normalizeVacancyStatusSlug as normalizeStatus }
export type { VacancyByClientChartRow }
