"use client"

import { useMemo, type ReactNode } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import {
  aggregateAiCoverageTotals,
  buildCandidatesByVacancyChartRows,
  buildExecutiveInsights,
  buildProgressByVacancyChartRows,
  buildVacancyStatusDonutData,
  formatDate,
  formatPercent,
  getDaysOpen,
  getVacancyHealth,
  sortRowsForTrafficLight,
  vacancyHealthBadgeClass,
  vacancyHealthLabel,
  type AvanceVacantesDashboardKpis,
  type VacancyByClientChartRow,
  type VacancyHealthLevel,
} from "@/lib/reportes-avance-vacantes-helpers"
import { formatVacancyStatusSlug } from "@/lib/reportes-display"
import {
  vacancyClientLabel,
  vacancyProgressPercentValue,
  vacancyStageCounts,
} from "@/lib/reportes-metrics"
import {
  Briefcase,
  CalendarClock,
  DoorClosed,
  DoorOpen,
  PauseCircle,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  UserSearch,
} from "lucide-react"

const COLOR_OPEN = "#6E3385"
const COLOR_CLOSED = "#496FB3"
const COLOR_PAUSED = "#CA8A04"
const COLOR_DRAFT = "#94A3B8"
const COLOR_ACCENT = "#7C3AED"
const COLOR_MUTED_BAR = "#CBD5E1"

interface AvanceVacantesPorClienteDashboardProps {
  rows: VacancyProgressByClientRow[]
  loading: boolean
  kpis: AvanceVacantesDashboardKpis
  chartByClient: VacancyByClientChartRow[]
  chartIsPageScoped: boolean
}

function DashboardCardShell({
  title,
  description,
  headingId,
  children,
  className = "",
  chartMinHeight = 220,
}: {
  title: string
  description?: string
  headingId: string
  children: ReactNode
  className?: string
  chartMinHeight?: number
}) {
  return (
    <section
      className={`rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm sm:p-6 ${className}`}
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="font-sans text-base font-semibold tracking-tight text-foreground"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-1 font-sans text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 w-full" style={{ minHeight: chartMinHeight }}>
        {children}
      </div>
    </section>
  )
}

function ChartEmptyInsight({ message }: { message: string }) {
  return (
    <div
      className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center"
      role="status"
    >
      <p className="max-w-md font-sans text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function KpiSkeletonGrid() {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"
      aria-hidden
    >
      {Array.from({ length: 11 }).map((_, i) => (
        <div
          key={String(i)}
          className="h-28 animate-pulse rounded-2xl border border-border/60 bg-muted/40"
        />
      ))}
    </div>
  )
}

interface KpiCardProps {
  icon: ReactNode
  label: string
  value: string
  helper: string
  toneClass: string
}

function KpiCard({ icon, label, value, helper, toneClass }: KpiCardProps) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border border-border/70 p-4 shadow-sm ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="rounded-lg bg-background/80 p-2 text-vo-purple [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      </div>
      <p className="font-sans text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <p className="font-sans text-[11px] leading-snug text-muted-foreground">{helper}</p>
    </div>
  )
}

function HealthBadge({ level }: { level: VacancyHealthLevel }) {
  return (
    <span className={vacancyHealthBadgeClass(level)}>{vacancyHealthLabel(level)}</span>
  )
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const label = formatVacancyStatusSlug(status)
  const slug = String(status ?? "").toLowerCase()
  const cls =
    slug === "open"
      ? "border-vo-purple/30 bg-vo-purple/10 text-vo-purple"
      : slug === "closed"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : slug === "paused"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-border bg-muted/50 text-muted-foreground"
  return (
    <span
      className={`inline-flex max-w-[140px] truncate rounded-full border px-2.5 py-0.5 font-sans text-xs font-medium ${cls}`}
      title={label}
    >
      {label}
    </span>
  )
}

function MiniProgress({ value }: { value: number | null }) {
  if (value == null || Number.isNaN(value)) {
    return <span className="font-sans text-xs text-muted-foreground">—</span>
  }
  const w = Math.min(100, Math.max(0, value))
  return (
    <div className="flex min-w-[120px] max-w-[180px] flex-col gap-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-linear-to-r from-vo-purple to-violet-500 transition-all"
          style={{ width: `${w}%` }}
        />
      </div>
      <span className="font-sans text-xs tabular-nums text-muted-foreground">
        {formatPercent(value)}
      </span>
    </div>
  )
}

function MatchVisual({ score }: { score: number | null | undefined }) {
  if (score == null || Number.isNaN(Number(score))) {
    return <span className="font-sans text-xs text-muted-foreground">—</span>
  }
  const n = Number(score)
  const tone =
    n >= 70
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : n >= 50
        ? "border-vo-purple/30 bg-vo-purple/10 text-vo-purple"
        : "border-amber-200 bg-amber-50 text-amber-900"
  const w = Math.min(100, Math.max(0, n))
  return (
    <div className="flex min-w-[88px] max-w-[120px] flex-col gap-1">
      <span
        className={`inline-flex w-fit rounded-full border px-2 py-0.5 font-sans text-xs font-semibold tabular-nums ${tone}`}
      >
        {Math.round(n)}%
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-linear-to-r from-vo-purple to-violet-500"
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  )
}

export function AvanceVacantesPorClienteDashboard({
  rows,
  loading,
  kpis,
  chartByClient,
  chartIsPageScoped,
}: AvanceVacantesPorClienteDashboardProps) {
  const progressRows = useMemo(() => buildProgressByVacancyChartRows(rows), [rows])
  const candidateRows = useMemo(() => buildCandidatesByVacancyChartRows(rows), [rows])
  const donutData = useMemo(() => buildVacancyStatusDonutData(rows), [rows])
  const aiTotals = useMemo(() => aggregateAiCoverageTotals(rows), [rows])
  const insights = useMemo(() => buildExecutiveInsights(rows), [rows])
  const traffic = useMemo(() => sortRowsForTrafficLight(rows), [rows])

  const progressChartHeight = Math.min(420, Math.max(140, 56 + progressRows.length * 36))
  const candidatesChartHeight = Math.min(
    420,
    Math.max(140, 56 + candidateRows.length * 32)
  )

  const showProgressChart = progressRows.length >= 1
  const showCandidatesChart = candidateRows.length >= 1
  const showDonut = donutData.length > 0 && donutData.some((d) => d.value > 0)
  const donutHasSingleState = donutData.filter((d) => d.value > 0).length <= 1

  const kpiTone = "bg-linear-to-br from-background to-violet-50/40"

  const kpiCards = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      <KpiCard
        icon={<Briefcase aria-hidden />}
        label="Total vacantes"
        value={loading ? "—" : String(kpis.totalVacancies)}
        helper={
          !loading && kpis.vacanciesOnPage < kpis.totalVacancies
            ? `Página: ${kpis.vacanciesOnPage} de ${kpis.totalVacancies} · Según filtros aplicados`
            : "Según filtros aplicados"
        }
        toneClass={kpiTone}
      />
      <KpiCard
        icon={<DoorOpen aria-hidden />}
        label="Vacantes abiertas"
        value={loading ? "—" : String(kpis.openCount)}
        helper="En esta página"
        toneClass={kpiTone}
      />
      <KpiCard
        icon={<DoorClosed aria-hidden />}
        label="Vacantes cerradas"
        value={loading ? "—" : String(kpis.closedCount)}
        helper="En esta página"
        toneClass={kpiTone}
      />
      <KpiCard
        icon={<PauseCircle aria-hidden />}
        label="En pausa"
        value={loading ? "—" : String(kpis.pausedCount)}
        helper="En esta página"
        toneClass={kpiTone}
      />
      <KpiCard
        icon={<Users aria-hidden />}
        label="Total candidatos"
        value={loading ? "—" : String(kpis.totalCandidates)}
        helper="Suma en página actual"
        toneClass={kpiTone}
      />
      <KpiCard
        icon={<UserSearch aria-hidden />}
        label="En entrevista"
        value={loading ? "—" : String(kpis.sumInterview)}
        helper="Suma en página actual"
        toneClass={kpiTone}
      />
      <KpiCard
        icon={<Star aria-hidden />}
        label="Finalistas"
        value={loading ? "—" : String(kpis.sumFinalist)}
        helper="Suma en página actual"
        toneClass={kpiTone}
      />
      <KpiCard
        icon={<UserCheck aria-hidden />}
        label="Contratados"
        value={loading ? "—" : String(kpis.sumHired)}
        helper="Suma en página actual"
        toneClass={kpiTone}
      />
      <KpiCard
        icon={<TrendingUp aria-hidden />}
        label="Avance promedio"
        value={
          loading || kpis.avgProgressPercent == null
            ? "—"
            : formatPercent(kpis.avgProgressPercent)
        }
        helper="Promedio de vacantes con avance en página"
        toneClass={kpiTone}
      />
      <KpiCard
        icon={<Sparkles aria-hidden />}
        label="Match IA promedio"
        value={
          loading || kpis.avgPreliminaryMatchOnPage == null
            ? "—"
            : `${kpis.avgPreliminaryMatchOnPage.toFixed(0)}%`
        }
        helper="Solo filas con dato de IA"
        toneClass={kpiTone}
      />
      <KpiCard
        icon={<CalendarClock aria-hidden />}
        label="Con análisis IA"
        value={loading ? "—" : String(kpis.sumPreliminaryAnalyzed)}
        helper="Candidatos evaluados por IA (suma página)"
        toneClass={kpiTone}
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="av-vac-kpis-heading">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="av-vac-kpis-heading"
            className="font-sans text-lg font-semibold text-foreground"
          >
            Indicadores clave
          </h2>
          <p className="font-sans text-xs text-muted-foreground">
            Los totales de candidatos y etapas suman la página actual; el total de vacantes
            refleja el filtro global del API.
          </p>
        </div>
        {loading ? <KpiSkeletonGrid /> : kpiCards}
      </section>

      <section aria-labelledby="av-vac-exec-heading">
        <h2
          id="av-vac-exec-heading"
          className="mb-3 font-sans text-lg font-semibold text-foreground"
        >
          Resumen ejecutivo
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className={`rounded-2xl border p-4 shadow-sm ${
                ins.isEmpty
                  ? "border-dashed border-border/80 bg-muted/15"
                  : "border-border/80 bg-linear-to-br from-card to-violet-50/30"
              }`}
            >
              <p className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ins.title}
              </p>
              <p className="mt-2 font-sans text-2xl font-semibold tabular-nums text-foreground">
                {ins.metric}
              </p>
              <p className="mt-2 line-clamp-3 font-sans text-xs leading-relaxed text-muted-foreground">
                {ins.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCardShell
          headingId="chart-progress"
          title="Avance por vacante"
          description="Barras horizontales según % de avance (solo filas con dato válido)."
          chartMinHeight={progressChartHeight}
        >
          {!showProgressChart ? (
            <ChartEmptyInsight message="No hay vacantes con porcentaje de avance informado en esta página." />
          ) : (
            <div className="space-y-3">
              {progressRows.length < 2 ? (
                <p className="font-sans text-xs text-muted-foreground">
                  Poca variedad de datos: vista compacta. Ajustá filtros o revisá la siguiente página
                  para comparar más vacantes.
                </p>
              ) : null}
              <div style={{ height: progressChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={progressRows}
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/80" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="vacancyTitle"
                      width={108}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const p = payload[0].payload as (typeof progressRows)[0]
                        return (
                          <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                            <p className="font-semibold text-foreground">{p.vacancyTitle}</p>
                            <p className="text-muted-foreground">{p.clientLabel}</p>
                            <p>Avance: {formatPercent(p.progressPercent)}</p>
                            <p>Candidatos: {p.totalCandidates}</p>
                            <p>
                              Match IA promedio:{" "}
                              {p.matchAvg == null ? "—" : `${Math.round(p.matchAvg)}%`}
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="progressPercent"
                      name="% avance"
                      radius={[0, 6, 6, 0]}
                      fill={COLOR_ACCENT}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </DashboardCardShell>

        <DashboardCardShell
          headingId="chart-candidates"
          title="Candidatos por vacante"
          description="Total de candidatos; tono neutro cuando la vacante no tiene postulaciones."
          chartMinHeight={candidatesChartHeight}
        >
          {!showCandidatesChart ? (
            <ChartEmptyInsight message="No hay filas para graficar candidatos." />
          ) : (
            <div style={{ height: candidatesChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={candidateRows}
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/80" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="vacancyTitle" width={108} tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const p = payload[0].payload as (typeof candidateRows)[0]
                      const fmt = (n: number | null) => (n == null ? "—" : String(n))
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                          <p className="font-semibold text-foreground">{p.vacancyTitle}</p>
                          <p>Total: {p.totalCandidates}</p>
                          <p>Entrevista: {fmt(p.interview)}</p>
                          <p>Finalistas: {fmt(p.finalist)}</p>
                          <p>Contratados: {fmt(p.hired)}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="totalCandidates" name="Candidatos" radius={[0, 6, 6, 0]}>
                    {candidateRows.map((entry) => (
                      <Cell
                        key={entry.vacancyKey}
                        fill={entry.isZero ? COLOR_MUTED_BAR : COLOR_OPEN}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </DashboardCardShell>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCardShell
          headingId="chart-status"
          title="Distribución por estado"
          description={
            donutHasSingleState
              ? "Un solo estado en esta página: seguimiento simple del portafolio."
              : "Proporción de vacantes según estado normalizado."
          }
          chartMinHeight={donutHasSingleState ? 200 : 260}
        >
          {!showDonut ? (
            <ChartEmptyInsight message="No hay datos de estado para graficar." />
          ) : (
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-center">
              <div className="h-[220px] w-full max-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={donutData.length > 1 ? 2 : 0}
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} stroke="var(--background)" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const p = payload[0].payload as { name?: string; value?: number }
                        return (
                          <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                            <p className="font-semibold">{p.name ?? "—"}</p>
                            <p className="text-muted-foreground">{p.value ?? 0} vacantes</p>
                          </div>
                        )
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </DashboardCardShell>

        <DashboardCardShell
          headingId="chart-ai"
          title="Cobertura de análisis IA"
          description="Relación entre candidatos totales y candidatos con análisis preliminar en la página actual."
          chartMinHeight={200}
        >
          <div className="flex h-full flex-col justify-center gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-4">
              <div>
                <p className="font-sans text-xs text-muted-foreground">Candidatos totales (página)</p>
                <p className="font-sans text-2xl font-semibold tabular-nums">{aiTotals.total}</p>
              </div>
              <div>
                <p className="font-sans text-xs text-muted-foreground">Con análisis IA</p>
                <p className="font-sans text-2xl font-semibold tabular-nums text-vo-purple">
                  {aiTotals.analyzed}
                </p>
              </div>
              <div className="min-w-[120px]">
                <p className="font-sans text-xs text-muted-foreground">Cobertura</p>
                <p className="font-sans text-2xl font-semibold tabular-nums">
                  {aiTotals.percentDisplay}
                </p>
              </div>
            </div>
            {aiTotals.total > 0 ? (
              <div className="space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-vo-purple to-violet-400"
                    style={{
                      width: `${Math.min(100, Math.round((aiTotals.analyzed / aiTotals.total) * 100))}%`,
                    }}
                  />
                </div>
                <p className="font-sans text-xs text-muted-foreground">
                  {aiTotals.analyzed === 0
                    ? "Sin análisis preliminar registrado en esta página."
                    : "Cobertura calculada como candidatos con análisis / candidatos totales."}
                </p>
              </div>
            ) : (
              <ChartEmptyInsight message="Sin candidatos en esta página: no aplica cobertura IA." />
            )}
          </div>
        </DashboardCardShell>
      </div>

      {chartByClient.length > 0 ? (
        <DashboardCardShell
          headingId="chart-by-client"
          title="Vacantes por cliente y estado"
          description={
            chartIsPageScoped
              ? "Según vacantes en esta página (la paginación no agrega todo el conjunto)."
              : "Comparativo de abiertas, cerradas, pausadas y borrador."
          }
          chartMinHeight={chartByClient.length === 1 ? 200 : 280}
        >
          <div style={{ height: chartByClient.length === 1 ? 200 : 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartByClient}
                margin={{ top: 8, right: 8, left: 4, bottom: chartByClient.length === 1 ? 24 : 56 }}
                barCategoryGap={chartByClient.length === 1 ? "24%" : "16%"}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/80" vertical={false} />
                <XAxis
                  dataKey="clientLabel"
                  tick={{ fontSize: chartByClient.length === 1 ? 12 : 10 }}
                  interval={0}
                  angle={chartByClient.length === 1 ? 0 : -24}
                  textAnchor={chartByClient.length === 1 ? "middle" : "end"}
                  height={chartByClient.length === 1 ? 32 : 64}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="abiertas" name="Abiertas" fill={COLOR_OPEN} radius={[4, 4, 0, 0]} />
                <Bar dataKey="cerradas" name="Cerradas" fill={COLOR_CLOSED} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pausadas" name="Pausadas" fill={COLOR_PAUSED} radius={[4, 4, 0, 0]} />
                <Bar dataKey="borradores" name="Borrador" fill={COLOR_DRAFT} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCardShell>
      ) : null}

      <DashboardCardShell
        headingId="traffic-list"
        title="Semáforo de vacantes"
        description="Clasificación heurística según avance, match IA, candidatos y antigüedad."
        chartMinHeight={280}
      >
        {rows.length === 0 ? (
          <ChartEmptyInsight message="No hay vacantes para evaluar en esta página." />
        ) : (
          <ul className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {traffic.map(({ row, health }) => {
              const days = getDaysOpen(row)
              const pct = vacancyProgressPercentValue(row)
              const match = row.averagePreliminaryMatchScore
              const total = typeof row.totalCandidates === "number" ? row.totalCandidates : 0
              return (
                <li
                  key={String(row.vacancyId ?? row.vacancyTitle)}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-sm font-semibold text-foreground">
                      {row.vacancyTitle ?? "—"}
                    </p>
                    <p className="truncate font-sans text-xs text-muted-foreground">
                      {vacancyClientLabel(row)}
                    </p>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-1 font-sans text-xs sm:grid-cols-5">
                    <div>
                      <p className="text-muted-foreground">Días</p>
                      <p className="tabular-nums font-medium">{days == null ? "—" : String(days)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Candidatos</p>
                      <p className="tabular-nums font-medium">{total}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avance</p>
                      <p className="tabular-nums font-medium">
                        {pct == null ? "—" : formatPercent(pct)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Match IA Ø</p>
                      <p className="tabular-nums font-medium">
                        {match == null || Number.isNaN(Number(match))
                          ? "—"
                          : `${Math.round(Number(match))}%`}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 sm:text-right">
                      <HealthBadge level={health} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </DashboardCardShell>
    </div>
  )
}

export function buildAvanceVacantesTableColumns(): {
  header: string
  render: (r: VacancyProgressByClientRow) => ReactNode
  numeric?: boolean
}[] {
  return [
    {
      header: "Vacante",
      render: (r: VacancyProgressByClientRow) => (
        <div className="min-w-0 max-w-[220px]">
          <p className="truncate font-sans text-sm font-semibold text-foreground">
            {r.vacancyTitle ?? "—"}
          </p>
          <p className="truncate font-sans text-xs text-muted-foreground">{vacancyClientLabel(r)}</p>
        </div>
      ),
    },
    {
      header: "Estado",
      render: (r: VacancyProgressByClientRow) => <StatusBadge status={r.vacancyStatus} />,
    },
    {
      header: "Semáforo",
      render: (r: VacancyProgressByClientRow) => (
        <HealthBadge level={getVacancyHealth(r)} />
      ),
    },
    {
      header: "Candidatos",
      render: (r: VacancyProgressByClientRow) => {
        const sc = vacancyStageCounts(r)
        const i = sc.interview
        const f = sc.finalist
        const h = sc.hired
        const parts = [
          `${typeof r.totalCandidates === "number" ? r.totalCandidates : "—"} total`,
          `${i == null ? "—" : i} entrev.`,
          `${f == null ? "—" : f} final.`,
          `${h == null ? "—" : h} contr.`,
        ]
        return (
          <span className="font-sans text-xs leading-snug text-muted-foreground">{parts.join(" · ")}</span>
        )
      },
    },
    {
      header: "Apertura",
      render: (r: VacancyProgressByClientRow) => (
        <span className="whitespace-nowrap font-sans text-xs text-foreground">
          {formatDate(r.openedAt)}
        </span>
      ),
    },
    {
      header: "Días",
      numeric: true,
      render: (r: VacancyProgressByClientRow) => {
        const d = getDaysOpen(r)
        return <span className="font-sans text-xs tabular-nums">{d == null ? "—" : String(d)}</span>
      },
    },
    {
      header: "Avance",
      render: (r: VacancyProgressByClientRow) => (
        <MiniProgress value={vacancyProgressPercentValue(r)} />
      ),
    },
    {
      header: "Match IA",
      render: (r: VacancyProgressByClientRow) => (
        <MatchVisual score={r.averagePreliminaryMatchScore ?? undefined} />
      ),
    },
    {
      header: "Análisis IA",
      render: (r: VacancyProgressByClientRow) => {
        const n = r.candidatesWithPreliminaryAnalysis
        if (n == null) return <span className="text-xs text-muted-foreground">—</span>
        if (n === 0) {
          return (
            <span className="rounded-md bg-muted px-2 py-1 font-sans text-xs text-muted-foreground">
              Sin análisis
            </span>
          )
        }
        return <span className="font-sans text-xs font-medium tabular-nums">{n}</span>
      },
    },
  ]
}
