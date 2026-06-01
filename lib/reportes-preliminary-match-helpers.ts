import type { PreliminaryMatchScoreRow } from "@/lib/api/recruiter-reports"
import { preliminaryMatchScoreValue } from "@/lib/reportes-metrics"

export type NormalizedMatchLevel = "High" | "Medium" | "Low" | "Unknown"

export interface ScoreTone {
  barClass: string
  textClass: string
  trackClass: string
}

export interface LevelTone {
  badgeClass: string
  label: string
}

export interface StatusTone {
  badgeClass: string
  label: string
}

export function getScoreTone(score: number | null | undefined): ScoreTone {
  if (score == null || Number.isNaN(Number(score))) {
    return {
      barClass: "bg-zinc-400",
      textClass: "text-zinc-600",
      trackClass: "bg-zinc-100",
    }
  }
  const n = Number(score)
  if (n >= 80) {
    return {
      barClass: "bg-emerald-500",
      textClass: "text-emerald-800",
      trackClass: "bg-emerald-100",
    }
  }
  if (n >= 50) {
    return {
      barClass: "bg-amber-400",
      textClass: "text-amber-900",
      trackClass: "bg-amber-100",
    }
  }
  return {
    barClass: "bg-red-500",
    textClass: "text-red-800",
    trackClass: "bg-red-100",
  }
}

function rawMatchToken(row: PreliminaryMatchScoreRow): string {
  const raw = (row.matchLevel ?? row.level ?? "").trim()
  return raw.toLowerCase()
}

export function normalizeMatchLevel(
  row: PreliminaryMatchScoreRow
): NormalizedMatchLevel {
  const t = rawMatchToken(row)
  if (t === "high") return "High"
  if (t === "medium") return "Medium"
  if (t === "low") return "Low"
  return "Unknown"
}

export function getMatchLevelTone(level: string | null | undefined): LevelTone {
  const t = (level ?? "").trim().toLowerCase()
  if (t === "high") {
    return {
      badgeClass:
        "border border-emerald-200 bg-emerald-50 text-emerald-900",
      label: "High",
    }
  }
  if (t === "medium") {
    return {
      badgeClass:
        "border border-amber-200 bg-amber-50 text-amber-900",
      label: "Medium",
    }
  }
  if (t === "low") {
    return {
      badgeClass: "border border-red-200 bg-red-50 text-red-900",
      label: "Low",
    }
  }
  return {
    badgeClass: "border border-zinc-200 bg-zinc-50 text-zinc-700",
    label: "Sin nivel",
  }
}

export function getStatusTone(status: string | null | undefined): StatusTone {
  const t = (status ?? "").trim().toLowerCase()
  if (t === "completed" || t === "complete" || t === "done") {
    return {
      badgeClass:
        "border border-violet-200 bg-violet-50 text-violet-900",
      label: "Completed",
    }
  }
  if (t === "failed" || t === "error") {
    return {
      badgeClass: "border border-red-200 bg-red-50 text-red-900",
      label: "Failed",
    }
  }
  if (t === "pending" || t === "running" || t === "in_progress") {
    return {
      badgeClass:
        "border border-amber-200 bg-amber-50 text-amber-900",
      label: "Pending",
    }
  }
  const label = (status ?? "").trim() || "—"
  return {
    badgeClass: "border border-zinc-200 bg-zinc-50 text-zinc-700",
    label,
  }
}

export function getInitials(fullName: string | null | undefined): string {
  const s = (fullName ?? "").trim()
  if (s === "") return "?"
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) {
    const w = parts[0]
    return w.slice(0, 2).toUpperCase()
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
}

export interface FormattedDateTime {
  dateLine: string
  timeLine: string
}

export function formatDateTime(
  iso: string | null | undefined
): FormattedDateTime | null {
  if (iso == null || String(iso).trim() === "") return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const dateLine = new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
  }).format(d)
  const timeLine = new Intl.DateTimeFormat("es", {
    timeStyle: "short",
  }).format(d)
  return { dateLine, timeLine }
}

export function rowAnalysisIso(
  row: PreliminaryMatchScoreRow
): string | null {
  const v = row.analyzedAt ?? row.evaluatedAt ?? row.createdAt
  if (v == null || String(v).trim() === "") return null
  return String(v)
}

export function calculateAverageScore(
  rows: readonly PreliminaryMatchScoreRow[]
): number | null {
  const vals: number[] = []
  for (const r of rows) {
    const v = preliminaryMatchScoreValue(r)
    if (v != null) vals.push(v)
  }
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export interface MatchLevelCounts {
  High: number
  Medium: number
  Low: number
  Unknown: number
}

export function groupByMatchLevel(
  rows: readonly PreliminaryMatchScoreRow[]
): MatchLevelCounts {
  const out: MatchLevelCounts = {
    High: 0,
    Medium: 0,
    Low: 0,
    Unknown: 0,
  }
  for (const r of rows) {
    const k = normalizeMatchLevel(r)
    out[k] += 1
  }
  return out
}

export interface VacancyAverageRow {
  vacancyTitle: string
  averageScore: number
  count: number
}

export function groupByVacancyAverage(
  rows: readonly PreliminaryMatchScoreRow[]
): VacancyAverageRow[] {
  const map = new Map<string, { sum: number; count: number }>()
  for (const r of rows) {
    const title = (r.vacancyTitle ?? "Sin título").trim() || "Sin título"
    const v = preliminaryMatchScoreValue(r)
    if (v == null) continue
    const cur = map.get(title) ?? { sum: 0, count: 0 }
    cur.sum += v
    cur.count += 1
    map.set(title, cur)
  }
  return [...map.entries()]
    .map(([vacancyTitle, { sum, count }]) => ({
      vacancyTitle,
      averageScore: sum / count,
      count,
    }))
    .sort((a, b) => b.averageScore - a.averageScore)
}

export function candidateDisplayName(
  row: PreliminaryMatchScoreRow
): string {
  const n =
    (row.candidateFullName ?? row.candidateName ?? "").trim() || "—"
  return n
}

export function candidateEmailDisplay(
  row: PreliminaryMatchScoreRow
): string | null {
  const e = (row.candidateEmail ?? "").trim()
  return e === "" ? null : e
}

export function stageDisplayLabel(row: PreliminaryMatchScoreRow): string {
  const s =
    (row.currentStageName ?? row.stageName ?? row.stageId ?? "").toString().trim()
  return s === "" ? "—" : s
}

export function bestScoringRow(
  rows: readonly PreliminaryMatchScoreRow[]
): PreliminaryMatchScoreRow | null {
  let best: PreliminaryMatchScoreRow | null = null
  let bestScore = -1
  for (const r of rows) {
    const v = preliminaryMatchScoreValue(r)
    if (v == null) continue
    if (v > bestScore) {
      bestScore = v
      best = r
    }
  }
  return best
}

export function latestAnalysisFormatted(
  rows: readonly PreliminaryMatchScoreRow[]
): FormattedDateTime | null {
  let bestTs = -Infinity
  let bestIso: string | null = null
  for (const r of rows) {
    const iso = rowAnalysisIso(r)
    if (!iso) continue
    const t = new Date(iso).getTime()
    if (!Number.isNaN(t) && t > bestTs) {
      bestTs = t
      bestIso = iso
    }
  }
  if (bestIso == null) return null
  return formatDateTime(bestIso)
}

export function countMatchLevelEquals(
  rows: readonly PreliminaryMatchScoreRow[],
  target: NormalizedMatchLevel
): number {
  let n = 0
  for (const r of rows) {
    if (normalizeMatchLevel(r) === target) n += 1
  }
  return n
}
