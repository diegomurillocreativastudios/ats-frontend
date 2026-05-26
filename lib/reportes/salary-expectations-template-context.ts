import type { ReportRuntimeRow } from "@/lib/api/recruiter-report-runtime"
import type {
  SalaryDistributionBucket,
  SalaryExpectationRow,
  SalaryExpectationsSummary,
} from "@/lib/api/recruiter-reports"
import {
  formatExecutiveInt,
  formatExecutivePercent,
} from "@/lib/reportes/executive-summary-metrics"
import { formatReportDate } from "@/lib/reportes-display"

export const SALARY_EXPECTATIONS_REPORT_KEY = "salary-expectations"

const EM_DASH = "—"
const DEFAULT_CURRENCY = "USD"

export interface BuildSalaryExpectationsContextInput {
  rows: Array<ReportRuntimeRow | SalaryExpectationRow>
  totalCount: number
  summary?: SalaryExpectationsSummary | null
  currency?: string | null
}

function coerceRows(
  rows: Array<ReportRuntimeRow | SalaryExpectationRow>
): SalaryExpectationRow[] {
  return rows.filter((r) => r != null && typeof r === "object") as SalaryExpectationRow[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function formatUsd(value: number | null | undefined, currency: string): string {
  if (value == null || !isFiniteNumber(Number(value))) return EM_DASH
  const n = Number(value)
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${currency} ${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
  }
}

function formatGap(value: number | null | undefined, currency: string): string {
  if (value == null || !isFiniteNumber(Number(value))) return EM_DASH
  const n = Number(value)
  if (n === 0) return formatUsd(0, currency)
  const sign = n > 0 ? "+" : "-"
  return `${sign}${formatUsd(Math.abs(n), currency)}`
}

function formatRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string
): string {
  if (min == null && max == null) return EM_DASH
  const left = min == null ? EM_DASH : formatUsd(min, currency)
  const right = max == null ? EM_DASH : formatUsd(max, currency)
  return `${left} ${EM_DASH} ${right}`
}

function rangeStatusLabel(row: SalaryExpectationRow): string {
  if (row.withinRange === true) return "Dentro del rango"
  const gap = row.gapAmountUsd
  if (gap == null) return EM_DASH
  if (Number(gap) > 0) return "Sobre el rango"
  if (Number(gap) < 0) return "Bajo el rango"
  return "Dentro del rango"
}

function safePercent(part: number, whole: number): number | null {
  if (whole <= 0) return null
  return Math.round((100 * part) / whole * 10) / 10
}

function buildDistribution(
  buckets: SalaryDistributionBucket[] | null | undefined,
  currency: string
): Array<{
  label: string
  lowerLabel: string
  upperLabel: string
  count: string
  countRaw: number
}> {
  if (!Array.isArray(buckets) || buckets.length === 0) return []
  return buckets.map((b) => {
    const lower = b?.lowerBoundUsd ?? null
    const upper = b?.upperBoundUsd ?? null
    const count = isFiniteNumber(Number(b?.count)) ? Number(b?.count) : 0
    const lowerLabel = lower == null ? EM_DASH : formatUsd(lower, currency)
    const upperLabel = upper == null ? "+" : formatUsd(upper, currency)
    const fallbackLabel = upper == null ? `${lowerLabel}+` : `${lowerLabel} ${EM_DASH} ${upperLabel}`
    return {
      label: (b?.label?.trim() || fallbackLabel) ?? fallbackLabel,
      lowerLabel,
      upperLabel,
      count: formatExecutiveInt(count),
      countRaw: count,
    }
  })
}

/**
 * KPIs, distribución salarial, brechas y filas formateadas para preview HTML
 * y PDF schema del reporte de pretensión salarial (USD).
 */
export function buildSalaryExpectationsTemplateContext(
  input: BuildSalaryExpectationsContextInput
): Record<string, unknown> {
  const currency = (input.currency?.trim() || DEFAULT_CURRENCY).toUpperCase()
  const rows = coerceRows(input.rows)
  const summary = input.summary ?? null

  const totalAnalyzed = Number(
    summary?.totalApplicationsAnalyzed ?? input.totalCount ?? rows.length
  )
  const applicationsWithSalary = Number(summary?.applicationsWithSalary ?? 0)
  const withinRangeCount = Number(summary?.withinRangeCount ?? 0)
  const aboveRangeCount = Number(summary?.aboveRangeCount ?? 0)
  const belowRangeCount = Number(summary?.belowRangeCount ?? 0)
  const applicationsWithoutSalary = Math.max(
    0,
    totalAnalyzed - applicationsWithSalary
  )

  const coveragePercent = safePercent(applicationsWithSalary, totalAnalyzed)
  const withinRangePercent = safePercent(withinRangeCount, totalAnalyzed)
  const aboveRangePercent = safePercent(aboveRangeCount, totalAnalyzed)
  const belowRangePercent = safePercent(belowRangeCount, totalAnalyzed)

  const distribution = buildDistribution(summary?.distribution, currency)
  const dominantBucket =
    distribution.length === 0
      ? null
      : [...distribution].sort((a, b) => b.countRaw - a.countRaw)[0]

  const detailRows = rows.map((r) => ({
    candidateName: r.candidateName?.trim() || EM_DASH,
    vacancyTitle: r.vacancyTitle?.trim() || EM_DASH,
    clientName: r.clientName?.trim() || EM_DASH,
    stageName: r.currentStageName?.trim() || EM_DASH,
    pipelineStatus: r.pipelineStatus?.trim() || EM_DASH,
    appliedAt: formatReportDate(r.appliedAt ?? undefined),
    expectedSalary: formatUsd(r.expectedSalaryUsd, currency),
    vacancyRange: formatRange(r.vacancyMinSalaryUsd, r.vacancyMaxSalaryUsd, currency),
    gapAmount: formatGap(r.gapAmountUsd, currency),
    rangeStatus: rangeStatusLabel(r),
  }))

  return {
    currency,
    salaryRowsTotal: formatExecutiveInt(totalAnalyzed),
    applicationsWithSalary: formatExecutiveInt(applicationsWithSalary),
    applicationsWithoutSalary: formatExecutiveInt(applicationsWithoutSalary),
    coveragePercent: coveragePercent == null ? EM_DASH : formatExecutivePercent(coveragePercent),
    averageSalary: formatUsd(summary?.averageUsd, currency),
    medianSalary: formatUsd(summary?.medianUsd, currency),
    minSalary: formatUsd(summary?.minUsd, currency),
    maxSalary: formatUsd(summary?.maxUsd, currency),
    percentile25Salary: formatUsd(summary?.percentile25Usd, currency),
    percentile75Salary: formatUsd(summary?.percentile75Usd, currency),
    withinRangeCount: formatExecutiveInt(withinRangeCount),
    aboveRangeCount: formatExecutiveInt(aboveRangeCount),
    belowRangeCount: formatExecutiveInt(belowRangeCount),
    withinRangePercent:
      withinRangePercent == null ? EM_DASH : formatExecutivePercent(withinRangePercent),
    aboveRangePercent:
      aboveRangePercent == null ? EM_DASH : formatExecutivePercent(aboveRangePercent),
    belowRangePercent:
      belowRangePercent == null ? EM_DASH : formatExecutivePercent(belowRangePercent),
    salaryDistribution: distribution.map((d) => ({
      label: d.label,
      lowerLabel: d.lowerLabel,
      upperLabel: d.upperLabel,
      count: d.count,
    })),
    dominantBucketLabel: dominantBucket?.label ?? EM_DASH,
    dominantBucketCount: dominantBucket
      ? formatExecutiveInt(dominantBucket.countRaw)
      : EM_DASH,
    detailRows,
  }
}
