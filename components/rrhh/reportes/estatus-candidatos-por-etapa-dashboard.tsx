"use client"

import { useMemo, type ReactNode } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type {
  CandidatePipelineSummary,
  CandidateStatusByStageRow,
} from "@/lib/api/recruiter-reports"
import {
  candidateDaysSinceLastMove,
  countCandidatesByStageOnPage,
} from "@/lib/reportes-metrics"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  GitBranch,
  Layers,
  Lightbulb,
  PieChart as PieChartIcon,
  Users,
} from "lucide-react"

const BRAND = "#6E3385"
const PIE_COLORS = ["#6E3385", "#496FB3", "#CA8A04", "#059669", "#7C3AED", "#DB2777", "#0EA5E9"]

export interface EstatusCandidatosStageRow {
  stageId?: string
  name: string
  count: number
  percent: number
}

interface BuildStagesResult {
  stages: EstatusCandidatosStageRow[]
  totalApplications: number
  dataSource: "summary" | "page"
}

function formatPercentOneDecimal(value: number): string {
  if (!Number.isFinite(value)) return "0.0"
  return `${value.toFixed(1)}%`
}

function concentrationLabelFromPercent(percent: number): "Alta" | "Media" | "Baja" {
  if (percent > 50) return "Alta"
  if (percent >= 30) return "Media"
  return "Baja"
}

function stageConcentrationBadge(percent: number): { label: string; className: string } {
  if (percent > 50) {
    return {
      label: "Alta concentración",
      className:
        "border-vo-purple/35 bg-vo-purple/12 text-vo-purple",
    }
  }
  if (percent >= 30) {
    return {
      label: "Concentración media",
      className:
        "border-amber-200/80 bg-amber-50 text-amber-900",
    }
  }
  return {
    label: "Baja concentración",
    className:
      "border-emerald-200/80 bg-emerald-50 text-emerald-900",
  }
}

function buildStagesFromSummary(
  summary: CandidatePipelineSummary
): EstatusCandidatosStageRow[] {
  const total = summary.totalCandidates
  return summary.byStage
    .filter((s) => s.count > 0)
    .map((s) => {
      let pct = s.percent
      if (pct == null || Number.isNaN(Number(pct))) {
        pct = total > 0 ? (s.count / total) * 100 : 0
      }
      return {
        stageId: s.stageId,
        name: s.stageName,
        count: s.count,
        percent: Number(pct),
      }
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"))
}

function buildStagesFromPageRows(
  rows: readonly CandidateStatusByStageRow[]
): EstatusCandidatosStageRow[] {
  const counts = countCandidatesByStageOnPage(rows)
  const total = rows.length
  if (total <= 0) return []
  return counts.map((s) => ({
    name: s.stageName,
    count: s.count,
    percent: (s.count / total) * 100,
  }))
}

export function resolveDashboardStages(
  summary: CandidatePipelineSummary | null,
  pageRows: readonly CandidateStatusByStageRow[],
  listTotalCount: number
): BuildStagesResult {
  if (
    summary &&
    summary.totalCandidates > 0 &&
    summary.byStage.some((s) => s.count > 0)
  ) {
    return {
      stages: buildStagesFromSummary(summary),
      totalApplications: summary.totalCandidates,
      dataSource: "summary",
    }
  }
  const fromPage = buildStagesFromPageRows(pageRows)
  const pageTotal = pageRows.length
  if (pageTotal > 0) {
    return {
      stages: fromPage,
      totalApplications: pageTotal,
      dataSource: "page",
    }
  }
  if (summary && summary.totalCandidates === 0) {
    return { stages: [], totalApplications: 0, dataSource: "summary" }
  }
  return {
    stages: [],
    totalApplications: listTotalCount,
    dataSource: "page",
  }
}

function funnelHealthBadge(percent: number): { label: string; className: string } {
  if (percent > 50) {
    return {
      label: "Acumulación en etapa",
      className: "border-vo-purple/30 bg-vo-purple/10 text-vo-purple",
    }
  }
  if (percent >= 30) {
    return {
      label: "Flujo moderado",
      className:
        "border-amber-200/80 bg-amber-50 text-amber-900",
    }
  }
  return {
    label: "Embudo disperso",
    className: "border-border bg-muted/60 text-muted-foreground",
  }
}

function KpiShell({
  icon,
  label,
  value,
  helper,
  badge,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  helper: string
  badge?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl border border-border/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="rounded-xl bg-vo-purple/10 p-2 text-vo-purple [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-sans text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        {badge}
      </div>
      <p className="mt-auto font-sans text-[11px] leading-snug text-muted-foreground">{helper}</p>
    </div>
  )
}

function ConcentrationBadge({ level }: { level: "Alta" | "Media" | "Baja" }) {
  const cls =
    level === "Alta"
      ? "border-vo-purple/35 bg-vo-purple/12 text-vo-purple"
      : level === "Media"
        ? "border-amber-200/80 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-700"
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {level}
    </span>
  )
}

export function EstatusCandidatosPorEtapaDashboardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={String(i)}
            className="h-32 animate-pulse rounded-2xl border border-border/60 bg-muted/50"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 h-72 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
        <div className="lg:col-span-2 h-72 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
      </div>
      <div className="h-24 animate-pulse rounded-2xl border border-border/60 bg-muted/40" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={String(i)}
            className="h-20 animate-pulse rounded-xl border border-border/60 bg-muted/35"
          />
        ))}
      </div>
    </div>
  )
}

export interface EstatusCandidatosPorEtapaDashboardProps {
  pipelineSummary: CandidatePipelineSummary | null
  summaryLoading: boolean
  reportLoading: boolean
  pageRows: CandidateStatusByStageRow[]
  listTotalCount: number
}

export function EstatusCandidatosPorEtapaDashboard({
  pipelineSummary,
  summaryLoading,
  reportLoading,
  pageRows,
  listTotalCount,
}: EstatusCandidatosPorEtapaDashboardProps) {
  const visualLoading = reportLoading || summaryLoading

  const resolved = useMemo(
    () => resolveDashboardStages(pipelineSummary, pageRows, listTotalCount),
    [pipelineSummary, pageRows, listTotalCount]
  )

  const { stages, totalApplications, dataSource } = resolved

  const effectiveTotalApplications =
    pipelineSummary != null && pipelineSummary.totalCandidates > 0
      ? pipelineSummary.totalCandidates
      : listTotalCount

  const dominant = useMemo(() => {
    if (stages.length === 0) return null
    return stages.reduce((best, cur) => (cur.count > best.count ? cur : best), stages[0])
  }, [stages])

  const dominantPercent = dominant?.percent ?? 0
  const embudoConcentration = concentrationLabelFromPercent(dominantPercent)
  const activeStagesCount = stages.length

  const barRows = useMemo(
    () => stages.map((s) => ({ name: s.name, count: s.count, stagePercent: s.percent })),
    [stages]
  )

  const pieData = useMemo(
    () =>
      stages.map((s, i) => ({
        name: s.name,
        value: s.count,
        percent: s.percent,
        fill: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [stages]
  )

  const insight = useMemo(() => {
    if (!dominant || totalApplications <= 0) {
      return {
        title: "Lectura rápida",
        body: "Aún no hay aplicaciones para analizar con los filtros actuales.",
        extra: null as string | null,
      }
    }
    const pctStr = formatPercentOneDecimal(dominant.percent)
    const scopeNote =
      dataSource === "page"
        ? " (vista aproximada según la página actual del listado)."
        : ""
    let body = `La mayor concentración está en "${dominant.name}", con ${dominant.count} de ${totalApplications} aplicaciones, equivalente al ${pctStr} del embudo${scopeNote}.`
    let extra: string | null = null
    if (dominant.percent > 50) {
      extra =
        "Esto puede indicar acumulación en esta etapa. Conviene revisar tiempos de respuesta o próximos pasos."
    }
    if (totalApplications < 5) {
      extra = [extra, "La muestra actual es pequeña, por lo que los porcentajes pueden variar fácilmente."]
        .filter(Boolean)
        .join(" ")
    }
    return { title: "Insight del reporte", body, extra }
  }, [dominant, totalApplications, dataSource])

  const health = funnelHealthBadge(dominantPercent)

  const chartFootnote =
    dataSource === "summary"
      ? "Distribución global según el resumen del API (totales bajo filtros)."
      : "Vista aproximada con la página actual del listado. El resumen agregado no está disponible."

  if (visualLoading) {
    return <EstatusCandidatosPorEtapaDashboardSkeleton />
  }

  const isGloballyEmpty = effectiveTotalApplications === 0

  if (isGloballyEmpty) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/90 bg-muted/15 px-6 py-16 text-center"
        role="status"
      >
        <Users className="h-10 w-10 text-muted-foreground/70" aria-hidden />
        <p className="max-w-md font-sans text-sm text-muted-foreground">
          No hay candidatos para los filtros seleccionados.
        </p>
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div
        className="rounded-2xl border border-border/80 bg-muted/10 px-5 py-8 text-center"
        role="status"
      >
        <p className="font-sans text-sm text-muted-foreground">
          No hay datos de embudo por etapa en esta página. Volvé a la primera página o esperá el
          resumen agregado del API para ver la distribución completa.
        </p>
      </div>
    )
  }

  const centerTotal = totalApplications

  const kpiTotalApplications = effectiveTotalApplications

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiShell
          icon={<Users aria-hidden />}
          label="Total aplicaciones"
          value={kpiTotalApplications}
          helper="Candidatos dentro del embudo filtrado."
        />
        <KpiShell
          icon={<Layers aria-hidden />}
          label="Etapas activas"
          value={activeStagesCount}
          helper="Etapas con candidatos actualmente."
        />
        <KpiShell
          icon={<GitBranch aria-hidden />}
          label="Etapa dominante"
          value={
            <span className="line-clamp-2 text-left text-lg font-semibold leading-snug">
              {dominant?.name ?? "—"}
            </span>
          }
          helper={
            dominant
              ? `${formatPercentOneDecimal(dominant.percent)} del total`
              : "Sin etapa destacada."
          }
        />
        <KpiShell
          icon={<Activity aria-hidden />}
          label="Concentración del embudo"
          value={embudoConcentration}
          helper="Ayuda a detectar posibles cuellos de botella."
          badge={<ConcentrationBadge level={embudoConcentration} />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section
          className="flex min-h-[300px] flex-col rounded-2xl border border-border/80 bg-white p-4 shadow-sm sm:p-5 lg:col-span-3"
          aria-labelledby="ec-bar-heading"
        >
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2
              id="ec-bar-heading"
              className="font-sans text-base font-semibold tracking-tight text-foreground"
            >
              Distribución por etapa
            </h2>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium ${health.className}`}
            >
              {health.label}
            </span>
          </div>
          <p className="mb-3 font-sans text-xs text-muted-foreground">{chartFootnote}</p>
          <div className="min-h-[240px] w-full flex-1" style={{ height: "min(420px, 55dvh)" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={barRows}
                margin={{ top: 8, right: 20, left: 4, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={132}
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <Tooltip
                  formatter={(value, _name, item) => {
                    const payload = item?.payload as { stagePercent?: number } | undefined
                    const pct = payload?.stagePercent
                    const pctText =
                      pct != null && Number.isFinite(pct)
                        ? ` (${formatPercentOneDecimal(pct)})`
                        : ""
                    return [`${value} candidatos${pctText}`, "Cantidad"]
                  }}
                  labelFormatter={(label) => `Etapa: ${label}`}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Candidatos" fill={BRAND} radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section
          className="flex min-h-[300px] flex-col rounded-2xl border border-border/80 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2"
          aria-labelledby="ec-donut-heading"
        >
          <div className="mb-1 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-vo-purple" aria-hidden />
            <h2
              id="ec-donut-heading"
              className="font-sans text-base font-semibold tracking-tight text-foreground"
            >
              Participación por etapa
            </h2>
          </div>
          <p className="mb-2 font-sans text-xs text-muted-foreground">
            Dona de distribución porcentual; pasá el cursor para ver cantidad y %.
          </p>
          <div className="relative w-full flex-1" style={{ height: "min(280px, 42dvh)" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`${entry.name}-${String(index)}`} fill={entry.fill} stroke="transparent" />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      const cx = (viewBox as { cx?: number }).cx ?? 0
                      const cy = (viewBox as { cy?: number }).cy ?? 0
                      return (
                        <text
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-foreground"
                        >
                          <tspan x={cx} dy="-0.15em" className="text-2xl font-bold tabular-nums">
                            {centerTotal}
                          </tspan>
                          <tspan x={cx} dy="1.35em" className="fill-muted-foreground text-[11px] font-medium">
                            Aplicaciones
                          </tspan>
                        </text>
                      )
                    }}
                  />
                </Pie>
                <Tooltip
                  formatter={(value, _n, item) => {
                    const p = (item?.payload as { percent?: number })?.percent
                    const pText =
                      p != null && Number.isFinite(p) ? ` · ${formatPercentOneDecimal(p)}` : ""
                    const n = typeof value === "number" ? value : Number(value)
                    return [`${Number.isFinite(n) ? n : value} candidatos${pText}`, "Cantidad"]
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: "11px", paddingTop: 8 }}
                  formatter={(value) => (
                    <span className="text-muted-foreground">{String(value)}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section
        className="rounded-2xl border border-vo-purple/15 bg-linear-to-br from-vo-purple/6 to-transparent p-4 shadow-sm sm:p-5"
        aria-labelledby="ec-insight-heading"
      >
        <div className="flex flex-wrap items-start gap-3">
          <span className="mt-0.5 rounded-xl bg-vo-purple/12 p-2 text-vo-purple">
            <Lightbulb className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <h2
              id="ec-insight-heading"
              className="font-sans text-sm font-semibold text-foreground"
            >
              {insight.title}
            </h2>
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
            {insight.extra ? (
              <p className="flex items-start gap-2 font-sans text-xs leading-relaxed text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                <span>{insight.extra}</span>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="ec-pipeline-heading">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <BarChart3 className="h-4 w-4 text-vo-purple" aria-hidden />
          <h2
            id="ec-pipeline-heading"
            className="font-sans text-base font-semibold tracking-tight text-foreground"
          >
            Pipeline por etapa
          </h2>
        </div>
        <p className="mb-4 font-sans text-xs text-muted-foreground">
          Embudo del proceso: cada tarjeta resume candidatos, participación y nivel de concentración.
        </p>
        <ul className="space-y-3">
          {stages.map((s) => {
            const badge = stageConcentrationBadge(s.percent)
            return (
              <li
                key={s.stageId ?? s.name}
                className="rounded-2xl border border-border/80 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-sans text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                      {s.count} {s.count === 1 ? "candidato" : "candidatos"} ·{" "}
                      {formatPercentOneDecimal(s.percent)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 font-sans text-[11px] font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-vo-purple to-violet-500 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, s.percent))}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(s.percent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progreso visual para ${s.name}`}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export function stageStatusPillClass(status: string): string {
  const k = status.toLowerCase()
  if (k.includes("rechaz") || k.includes("descart") || k.includes("cancel"))
    return "border-rose-200 bg-rose-50 text-rose-900"
  if (k.includes("contrat") || k.includes("hired") || k.includes("ganador") || k.includes("oferta"))
    return "border-emerald-200 bg-emerald-50 text-emerald-900"
  if (k.includes("espera") || k.includes("pend") || k.includes("review") || k.includes("revis"))
    return "border-vo-purple/30 bg-vo-purple/10 text-vo-purple"
  if (k.includes("entrev") || k.includes("interview"))
    return "border-sky-200 bg-sky-50 text-sky-900"
  return "border-border bg-muted/60 text-muted-foreground"
}

export function daysInStageIndicator(days: number | null): {
  label: string
  tone: "normal" | "warning" | "alert"
  dotClass: string
} {
  if (days == null || Number.isNaN(days)) {
    return { label: "Sin dato", tone: "normal", dotClass: "bg-slate-300" }
  }
  if (days <= 3) {
    return { label: "Normal", tone: "normal", dotClass: "bg-emerald-500" }
  }
  if (days <= 7) {
    return { label: "Atención", tone: "warning", dotClass: "bg-amber-500" }
  }
  return { label: "Alerta", tone: "alert", dotClass: "bg-rose-500" }
}

export function StagePill({ text }: { text: string }) {
  return (
    <span
      className={`inline-flex max-w-[200px] truncate rounded-full border px-2.5 py-0.5 font-sans text-xs font-medium ${stageStatusPillClass(text)}`}
      title={text}
    >
      {text}
    </span>
  )
}

export function DaysInStageCell({ row }: { row: CandidateStatusByStageRow }) {
  const raw =
    row.daysInStage != null && !Number.isNaN(Number(row.daysInStage))
      ? Number(row.daysInStage)
      : null
  const d = raw ?? candidateDaysSinceLastMove(row)
  const indicator = daysInStageIndicator(d)
  return (
    <div className="flex min-w-[140px] items-center justify-end gap-2">
      <span className="font-sans text-sm tabular-nums text-foreground">{d == null ? "—" : String(d)}</span>
      <span className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${indicator.dotClass}`} aria-hidden />
        <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {indicator.label}
        </span>
      </span>
    </div>
  )
}
