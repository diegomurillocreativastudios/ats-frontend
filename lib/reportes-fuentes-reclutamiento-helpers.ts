import type { LucideIcon } from "lucide-react"
import {
  Briefcase,
  Building2,
  Globe,
  Link2,
  Megaphone,
  Share2,
  UserCircle,
  Users,
} from "lucide-react"
import type { RecruitmentSourceRow } from "@/lib/api/recruiter-reports"
import { formatRecruitmentSourceLabel } from "@/lib/reportes-display"

export function safeNum(value: number | null | undefined): number {
  if (value == null || Number.isNaN(Number(value))) return 0
  return Number(value)
}

export function getTotalCandidates(rows: readonly RecruitmentSourceRow[]): number {
  let t = 0
  for (const r of rows) t += safeNum(r.candidatesCount)
  return t
}

export function getTotalHires(rows: readonly RecruitmentSourceRow[]): number {
  let t = 0
  for (const r of rows) t += safeNum(r.hiresCount)
  return t
}

export function getTotalPreselected(rows: readonly RecruitmentSourceRow[]): number {
  let t = 0
  for (const r of rows) t += safeNum(r.preselectedCount)
  return t
}

export function getTotalInterviewed(rows: readonly RecruitmentSourceRow[]): number {
  let t = 0
  for (const r of rows) t += safeNum(r.interviewedCount)
  return t
}

export function getTotalFinalists(rows: readonly RecruitmentSourceRow[]): number {
  let t = 0
  for (const r of rows) t += safeNum(r.finalistsCount)
  return t
}

/**
 * Conversión global de la página: contratados / candidatos cuando hay volumen;
 * si no hay candidatos, promedio simple de los % informados por fila.
 */
export function getAverageConversion(rows: readonly RecruitmentSourceRow[]): number {
  const totalC = getTotalCandidates(rows)
  const totalH = getTotalHires(rows)
  if (totalC > 0) return (totalH / totalC) * 100
  const conv: number[] = []
  for (const r of rows) {
    const p = r.conversionPercent
    if (typeof p === "number" && !Number.isNaN(p)) conv.push(p)
  }
  if (conv.length === 0) return 0
  return conv.reduce((a, b) => a + b, 0) / conv.length
}

export interface BestSourceResult {
  row: RecruitmentSourceRow
  mode: "by_conversion" | "by_volume"
}

export function getBestSource(
  rows: readonly RecruitmentSourceRow[]
): BestSourceResult | null {
  if (rows.length === 0) return null
  const anyHires = rows.some((r) => safeNum(r.hiresCount) > 0)
  const scored = rows.map((row) => {
    const c = safeNum(row.candidatesCount)
    const h = safeNum(row.hiresCount)
    const conv = safeNum(row.conversionPercent)
    return { row, c, h, conv }
  })
  if (anyHires) {
    scored.sort((a, b) => {
      if (b.conv !== a.conv) return b.conv - a.conv
      if (b.h !== a.h) return b.h - a.h
      return b.c - a.c
    })
    return { row: scored[0].row, mode: "by_conversion" }
  }
  scored.sort((a, b) => b.c - a.c)
  return { row: scored[0].row, mode: "by_volume" }
}

export function getSourceParticipation(
  row: RecruitmentSourceRow,
  totalCandidates: number
): number {
  if (totalCandidates <= 0) return 0
  return (safeNum(row.candidatesCount) / totalCandidates) * 100
}

export type ConversionTone = "none" | "low" | "medium" | "high"

export interface ConversionToneMeta {
  tone: ConversionTone
  badgeLabel: string
  badgeClassName: string
}

export function getConversionTone(
  conversionPercent: number | null | undefined,
  hiresCount?: number | null
): ConversionToneMeta {
  const h = safeNum(hiresCount)
  const p = conversionPercent == null || Number.isNaN(Number(conversionPercent)) ? 0 : Number(conversionPercent)

  if (h <= 0) {
    return {
      tone: "none",
      badgeLabel: "Sin contrataciones",
      badgeClassName: "border-border bg-muted/60 text-muted-foreground",
    }
  }

  if (p <= 0) {
    return {
      tone: "low",
      badgeLabel: "Conversión baja",
      badgeClassName:
        "border-amber-300/80 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    }
  }
  if (p <= 30) {
    return {
      tone: "low",
      badgeLabel: "Conversión baja",
      badgeClassName:
        "border-amber-300/80 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    }
  }
  if (p <= 60) {
    return {
      tone: "medium",
      badgeLabel: "Conversión media",
      badgeClassName: "border-sky-300/80 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100",
    }
  }
  return {
    tone: "high",
    badgeLabel: "Conversión alta",
    badgeClassName: "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
  }
}

const SOURCE_ICON_MAP: Record<string, LucideIcon> = {
  recruiter: UserCircle,
  personal: Users,
  linkedin: Briefcase,
  referral: Share2,
  referido: Share2,
  jobboard: Megaphone,
  website: Globe,
  web: Globe,
  internal: Building2,
  interna: Building2,
  social: Share2,
  agency: Building2,
  manual: UserCircle,
  other: Link2,
}

export function getSourceIcon(sourceKey: string | null | undefined): LucideIcon {
  const k = String(sourceKey ?? "")
    .toLowerCase()
    .trim()
  if (k && SOURCE_ICON_MAP[k]) return SOURCE_ICON_MAP[k]
  return Users
}

export function formatPercent(value: number | null | undefined, fractionDigits = 2): string {
  if (value == null || Number.isNaN(Number(value))) return "—"
  return `${Number(value).toFixed(fractionDigits)}%`
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—"
  return new Intl.NumberFormat("es", { maximumFractionDigits: 0 }).format(Number(value))
}

export function normalizeSourceLabel(
  sourceLabel: string | null | undefined,
  sourceKey: string | null | undefined
): string {
  return formatRecruitmentSourceLabel({
    sourceLabel: sourceLabel ?? undefined,
    sourceKey: sourceKey ?? undefined,
  })
}

export interface PipelineStageModel {
  key: string
  label: string
  value: number
}

export function getPipelineStages(row: RecruitmentSourceRow): PipelineStageModel[] {
  return [
    { key: "pre", label: "Preseleccionados", value: safeNum(row.preselectedCount) },
    { key: "int", label: "Entrevistados", value: safeNum(row.interviewedCount) },
    { key: "fin", label: "Finalistas", value: safeNum(row.finalistsCount) },
    { key: "hir", label: "Contratados", value: safeNum(row.hiresCount) },
  ]
}

export function getFeaturedSources(
  rows: readonly RecruitmentSourceRow[],
  limit = 3
): RecruitmentSourceRow[] {
  if (rows.length === 0) return []
  const anyHires = rows.some((r) => safeNum(r.hiresCount) > 0)
  const copy = [...rows]
  if (anyHires) {
    copy.sort((a, b) => {
      const convDiff = safeNum(b.conversionPercent) - safeNum(a.conversionPercent)
      if (convDiff !== 0) return convDiff
      const hDiff = safeNum(b.hiresCount) - safeNum(a.hiresCount)
      if (hDiff !== 0) return hDiff
      return safeNum(b.candidatesCount) - safeNum(a.candidatesCount)
    })
  } else {
    copy.sort((a, b) => safeNum(b.candidatesCount) - safeNum(a.candidatesCount))
  }
  return copy.slice(0, limit)
}

export function featuredSourceMessage(row: RecruitmentSourceRow): string {
  const c = safeNum(row.candidatesCount)
  const h = safeNum(row.hiresCount)
  if (c <= 0) return "Sin actividad en el periodo."
  if (h > 0) return "Canal con resultados positivos."
  return "Canal con actividad, pendiente de conversión."
}

export function allConversionsZero(rows: readonly RecruitmentSourceRow[]): boolean {
  if (rows.length === 0) return true
  return rows.every((r) => safeNum(r.conversionPercent) <= 0 && safeNum(r.hiresCount) <= 0)
}
