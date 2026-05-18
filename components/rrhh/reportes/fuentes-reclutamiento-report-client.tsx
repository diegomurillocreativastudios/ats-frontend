"use client"

import type { ReactNode } from "react"
import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Award,
  Briefcase,
  CalendarClock,
  ChevronRight,
  Crown,
  Layers,
  Percent,
  UserCheck,
  Users,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import ReportesFiltersPlaceholder, {
  ReportesFilterControl,
} from "@/components/rrhh/reportes/reportes-filters-placeholder"
import ReportesDataTable from "@/components/rrhh/reportes/reportes-data-table"
import { ReportesChartCard } from "@/components/rrhh/reportes/reportes-chart-card"
import { ReportesExportToolbar } from "@/components/rrhh/reportes/reportes-export-toolbar"
import { ReportesQueryActions } from "@/components/rrhh/reportes/reportes-query-actions"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  fetchRecruitmentSources,
  fetchReportsFilters,
  listRecruiterCompanies,
  listRecruiterVacancies,
  type RecruiterCompanyOption,
  type RecruiterVacancyOption,
  type RecruitmentSourceRow,
} from "@/lib/api/recruiter-reports"
import { displayCompanyOrClientLabel } from "@/lib/reportes-metrics"
import {
  allConversionsZero,
  featuredSourceMessage,
  formatNumber,
  formatPercent,
  getAverageConversion,
  getBestSource,
  getConversionTone,
  getFeaturedSources,
  getPipelineStages,
  getSourceIcon,
  getSourceParticipation,
  getTotalCandidates,
  getTotalFinalists,
  getTotalHires,
  getTotalInterviewed,
  getTotalPreselected,
  normalizeSourceLabel,
} from "@/lib/reportes-fuentes-reclutamiento-helpers"
import {
  defaultMonthDateRange,
  formatPercent as formatPercentOneDecimal,
  formatRecruitmentSourceLabel,
} from "@/lib/reportes-display"

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

const PAGE_SIZE = 50

const PIE_COLORS = [
  "#6E3385",
  "#496FB3",
  "#CA8A04",
  "#059669",
  "#7C3AED",
  "#DB2777",
  "#0EA5E9",
  "#14B8A6",
]

function rowLabelForCharts(
  r: RecruitmentSourceRow,
  groupBy: "source" | "vacancy"
): string {
  if (groupBy === "vacancy") {
    const vac = (r.vacancyTitle ?? "—").slice(0, 14)
    const src = formatRecruitmentSourceLabel(r)
    return `${vac}${vac.length >= 14 ? "…" : ""} · ${src}`.slice(0, 42)
  }
  return formatRecruitmentSourceLabel(r)
}

function KpiCard(props: {
  title: string
  value: ReactNode
  subtitle?: string
  icon: ReactNode
  accentClassName: string
  loading?: boolean
}) {
  const { title, value, subtitle, icon, accentClassName, loading } = props
  return (
    <div className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accentClassName}`}
          aria-hidden
        >
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="mt-3 h-9 w-24 animate-pulse rounded-md bg-muted" />
      ) : (
        <p className="mt-1 font-sans text-2xl font-bold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
      )}
      {subtitle && !loading ? (
        <p className="mt-1 font-sans text-[11px] leading-snug text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

function FunnelStageBlock(props: {
  label: string
  value: number
  percentOfCandidates: number
  isZero: boolean
}) {
  const { label, value, percentOfCandidates, isZero } = props
  return (
    <div className="min-w-0 flex-1">
      <div
        className={[
          "flex h-full flex-col gap-1 rounded-2xl border px-4 py-3 shadow-sm",
          isZero
            ? "border-dashed border-border bg-muted/20 text-muted-foreground"
            : "border-border/80 bg-card text-foreground",
        ].join(" ")}
      >
        <span className="font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="font-sans text-2xl font-bold tabular-nums">{formatNumber(value)}</span>
        <span className="font-sans text-xs tabular-nums">
          {percentOfCandidates.toFixed(1)}% del total de candidatos
        </span>
        {isZero ? (
          <span className="font-sans text-[10px] text-muted-foreground">Sin registros en esta etapa</span>
        ) : null}
      </div>
    </div>
  )
}

function MiniPipelineRow(props: { row: RecruitmentSourceRow }) {
  const stages = getPipelineStages(props.row)
  const max = Math.max(...stages.map((s) => s.value), 1)
  return (
    <div className="flex flex-col gap-1.5">
      {stages.map((s) => (
        <div key={s.key} className="flex items-center gap-2">
          <span className="w-24 shrink-0 font-sans text-[10px] text-muted-foreground">{s.label}</span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-vo-purple/80"
              style={{ width: `${(s.value / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right font-sans text-[10px] tabular-nums text-foreground">
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function FuentesReclutamientoReportClient() {
  const trail = [
    { label: "Reportes", href: "/portal-rrhh/reportes" },
    { label: "Fuentes de reclutamiento" },
  ]

  const initialRange = defaultMonthDateRange()

  const [companies, setCompanies] = useState<RecruiterCompanyOption[]>([])
  const [vacancies, setVacancies] = useState<RecruiterVacancyOption[]>([])
  const [sourceKeyOptions, setSourceKeyOptions] = useState<string[]>([])

  const [draftClientId, setDraftClientId] = useState("")
  const [draftVacancyId, setDraftVacancyId] = useState("")
  const [draftDateFrom, setDraftDateFrom] = useState(initialRange.dateFrom)
  const [draftDateTo, setDraftDateTo] = useState(initialRange.dateTo)
  const [draftGroupBy, setDraftGroupBy] = useState<"source" | "vacancy">("source")
  const [draftSource, setDraftSource] = useState("")

  const [appliedClientId, setAppliedClientId] = useState("")
  const [appliedVacancyId, setAppliedVacancyId] = useState("")
  const [appliedDateFrom, setAppliedDateFrom] = useState(initialRange.dateFrom)
  const [appliedDateTo, setAppliedDateTo] = useState(initialRange.dateTo)
  const [appliedGroupBy, setAppliedGroupBy] = useState<"source" | "vacancy">("source")
  const [appliedSource, setAppliedSource] = useState("")

  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<RecruitmentSourceRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCatalogs = useCallback(async () => {
    try {
      const [co, va] = await Promise.all([
        listRecruiterCompanies(),
        listRecruiterVacancies(),
      ])
      setCompanies(co)
      setVacancies(va)
    } catch {
      setCompanies([])
      setVacancies([])
    }
  }, [])

  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  useEffect(() => {
    if (!draftDateFrom.trim() || !draftDateTo.trim()) {
      setSourceKeyOptions([])
      return
    }
    let cancelled = false
    const run = async () => {
      try {
        const f = await fetchReportsFilters({
          clientId: draftClientId || undefined,
          dateFrom: draftDateFrom,
          dateTo: draftDateTo,
        })
        if (!cancelled) setSourceKeyOptions(f.recruitmentSourceKeys ?? [])
      } catch {
        if (!cancelled) setSourceKeyOptions([])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [draftClientId, draftDateFrom, draftDateTo])

  const loadReport = useCallback(async () => {
    if (!appliedDateFrom.trim() || !appliedDateTo.trim()) {
      setError("Las fechas desde y hasta son obligatorias para este reporte.")
      setRows([])
      setTotalCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetchRecruitmentSources({
        dateFrom: appliedDateFrom,
        dateTo: appliedDateTo,
        clientId: appliedClientId || undefined,
        vacancyId: appliedVacancyId || undefined,
        source: appliedSource || undefined,
        groupBy: appliedGroupBy,
        page,
        pageSize: PAGE_SIZE,
      })
      setRows(res.rows)
      setTotalCount(res.totalCount)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "No se pudo cargar el reporte.")
      setRows([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [
    appliedClientId,
    appliedVacancyId,
    appliedDateFrom,
    appliedDateTo,
    appliedGroupBy,
    appliedSource,
    page,
  ])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleApplyFilters = () => {
    if (!draftDateFrom.trim() || !draftDateTo.trim()) {
      setError("Indicá fecha desde y hasta antes de aplicar.")
      setRows([])
      setTotalCount(0)
      return
    }
    setAppliedClientId(draftClientId)
    setAppliedVacancyId(draftVacancyId)
    setAppliedDateFrom(draftDateFrom)
    setAppliedDateTo(draftDateTo)
    setAppliedGroupBy(draftGroupBy)
    setAppliedSource(draftSource)
    setPage(1)
  }

  const handleClearFilters = () => {
    const r = defaultMonthDateRange()
    setDraftClientId("")
    setDraftVacancyId("")
    setDraftDateFrom(r.dateFrom)
    setDraftDateTo(r.dateTo)
    setDraftGroupBy("source")
    setDraftSource("")
    setAppliedClientId("")
    setAppliedVacancyId("")
    setAppliedDateFrom(r.dateFrom)
    setAppliedDateTo(r.dateTo)
    setAppliedGroupBy("source")
    setAppliedSource("")
    setPage(1)
    setError(null)
  }

  const totalCandidatesPage = useMemo(() => getTotalCandidates(rows), [rows])
  const totalHiresPage = useMemo(() => getTotalHires(rows), [rows])
  const totalPrePage = useMemo(() => getTotalPreselected(rows), [rows])
  const totalIntPage = useMemo(() => getTotalInterviewed(rows), [rows])
  const totalFinPage = useMemo(() => getTotalFinalists(rows), [rows])
  const avgConv = useMemo(() => getAverageConversion(rows), [rows])
  const best = useMemo(() => getBestSource(rows), [rows])
  const featured = useMemo(() => getFeaturedSources(rows, 3), [rows])
  const conversionsAllZero = useMemo(() => allConversionsZero(rows), [rows])

  const pageScopeNote =
    totalCount > rows.length
      ? `Métricas de embudo y sumas según ${rows.length} filas en esta página (${totalCount} fuentes con el filtro).`
      : "Métricas calculadas con las filas visibles del periodo."

  const pieByCandidates = useMemo(
    () =>
      rows
        .map((r, i) => ({
          name: rowLabelForCharts(r, appliedGroupBy),
          value: r.candidatesCount ?? 0,
          fill: PIE_COLORS[i % PIE_COLORS.length],
        }))
        .filter((d) => d.value > 0),
    [rows, appliedGroupBy]
  )

  const candidatesBarData = useMemo(
    () =>
      [...rows]
        .map((r) => ({
          name: rowLabelForCharts(r, appliedGroupBy).slice(0, 22),
          fullName: rowLabelForCharts(r, appliedGroupBy),
          candidatos: r.candidatesCount ?? 0,
        }))
        .sort((a, b) => b.candidatos - a.candidatos),
    [rows, appliedGroupBy]
  )

  const maxCandidatesBar = useMemo(
    () => Math.max(...candidatesBarData.map((d) => d.candidatos), 1),
    [candidatesBarData]
  )

  const vacancyClientCell = (r: RecruitmentSourceRow) =>
    displayCompanyOrClientLabel(r.clientName, undefined)

  const contextCell = (r: RecruitmentSourceRow) => {
    if (appliedGroupBy === "vacancy") {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-sans text-sm font-medium text-foreground">
            {r.vacancyTitle?.trim() || "Vacante sin título"}
          </span>
          <span className="font-sans text-xs text-muted-foreground">{vacancyClientCell(r)}</span>
        </div>
      )
    }
    const hasClient = r.clientName != null && String(r.clientName).trim() !== ""
    const hasVac = r.vacancyTitle != null && String(r.vacancyTitle).trim() !== ""
    if (!hasClient && !hasVac) {
      return (
        <span className="font-sans text-sm text-muted-foreground">Vista general · todas las vacantes</span>
      )
    }
    return (
      <div className="flex flex-col gap-0.5">
        {hasClient ? (
          <span className="font-sans text-sm text-foreground">{String(r.clientName).trim()}</span>
        ) : null}
        {hasVac ? (
          <span className="font-sans text-xs text-muted-foreground">{String(r.vacancyTitle).trim()}</span>
        ) : null}
      </div>
    )
  }

  type SourceColumn = {
    header: string
    render: (r: RecruitmentSourceRow) => ReactNode
    numeric?: boolean
  }

  const columns = useMemo((): readonly SourceColumn[] => {
    const funnelBase = Math.max(totalCandidatesPage, 1)
    const cols: SourceColumn[] = [
      {
        header: "Fuente",
        render: (r: RecruitmentSourceRow) => {
          const Icon = getSourceIcon(r.sourceKey ?? r.applicationSource)
          const label = normalizeSourceLabel(r.sourceLabel, r.sourceKey ?? r.applicationSource)
          const key = String(r.sourceKey ?? r.applicationSource ?? "").trim() || "—"
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40">
                <Icon className="h-5 w-5 text-vo-purple" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="truncate font-sans text-sm font-medium text-foreground">{label}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{key}</p>
              </div>
            </div>
          )
        },
      },
      {
        header: "Contexto",
        render: contextCell,
      },
      {
        header: "Candidatos",
        numeric: true,
        render: (r: RecruitmentSourceRow) => {
          const n = r.candidatesCount ?? 0
          const part = funnelBase > 0 ? (n / funnelBase) * 100 : 0
          return (
            <div className="flex flex-col items-end gap-1">
              <span className="font-sans text-lg font-semibold tabular-nums text-foreground">
                {formatNumber(n)}
              </span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-indigo-500/90"
                  style={{ width: `${Math.min(100, part)}%` }}
                />
              </div>
            </div>
          )
        },
      },
      {
        header: "Pipeline",
        render: (r: RecruitmentSourceRow) => <MiniPipelineRow row={r} />,
      },
      {
        header: "Contratados",
        numeric: true,
        render: (r: RecruitmentSourceRow) => (
          <span className="font-sans text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatNumber(r.hiresCount)}
          </span>
        ),
      },
      {
        header: "Conversión",
        numeric: true,
        render: (r: RecruitmentSourceRow) => {
          const meta = getConversionTone(r.conversionPercent, r.hiresCount)
          const pct =
            r.conversionPercent == null || Number.isNaN(Number(r.conversionPercent))
              ? formatPercent(0)
              : formatPercent(Number(r.conversionPercent))
          return (
            <div className="flex flex-col items-end gap-1">
              <span className="font-sans text-sm font-semibold tabular-nums">{pct}</span>
              <span
                className={[
                  "inline-flex rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium",
                  meta.badgeClassName,
                ].join(" ")}
              >
                {meta.badgeLabel}
              </span>
            </div>
          )
        },
      },
    ]
    return cols
  }, [appliedGroupBy, totalCandidatesPage])

  const csvMatrix = useMemo(() => {
    const header =
      appliedGroupBy === "vacancy"
        ? [
            "Fuente",
            "Vacante",
            "Cliente",
            "Candidatos",
            "Preseleccionados",
            "Entrevistados",
            "Finalistas",
            "Contratados",
            "Conversión",
          ]
        : [
            "Fuente",
            "Candidatos",
            "Preseleccionados",
            "Entrevistados",
            "Finalistas",
            "Contratados",
            "Conversión",
          ]
    const body = rows.map((r) => {
      const core = [
        formatRecruitmentSourceLabel(r),
        String(r.candidatesCount ?? ""),
        String(r.preselectedCount ?? ""),
        String(r.interviewedCount ?? ""),
        String(r.finalistsCount ?? ""),
        String(r.hiresCount ?? ""),
        formatPercentOneDecimal(r.conversionPercent ?? undefined),
      ]
      if (appliedGroupBy === "vacancy") {
        return [
          formatRecruitmentSourceLabel(r),
          r.vacancyTitle ?? "",
          vacancyClientCell(r),
          ...core.slice(1),
        ]
      }
      return core
    })
    return [header, ...body]
  }, [rows, appliedGroupBy])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, totalCount)

  const statusLine =
    !loading && !error && totalCount > 0
      ? `Mostrando ${showingFrom}–${showingTo} de ${totalCount}`
      : !loading && !error
        ? `${totalCount} ${totalCount === 1 ? "fila" : "filas"}`
        : ""

  const funnelBase = Math.max(totalCandidatesPage, 1)
  const funnelStages = [
    { key: "cand", label: "Candidatos", value: totalCandidatesPage, pct: 100 },
    {
      key: "pre",
      label: "Preseleccionados",
      value: totalPrePage,
      pct: (totalPrePage / funnelBase) * 100,
    },
    {
      key: "int",
      label: "Entrevistados",
      value: totalIntPage,
      pct: (totalIntPage / funnelBase) * 100,
    },
    {
      key: "fin",
      label: "Finalistas",
      value: totalFinPage,
      pct: (totalFinPage / funnelBase) * 100,
    },
    {
      key: "hir",
      label: "Contratados",
      value: totalHiresPage,
      pct: (totalHiresPage / funnelBase) * 100,
    },
  ]

  const badgeCountLabel = `${totalCount} ${totalCount === 1 ? "fuente encontrada" : "fuentes encontradas"}`

  const bestLabel = best
    ? normalizeSourceLabel(best.row.sourceLabel, best.row.sourceKey ?? best.row.applicationSource)
    : "—"

  return (
    <RrhhReportsShell breadcrumbLabel="Reportes" breadcrumbTrail={trail}>
      <div className="min-w-0 flex flex-col gap-8 pb-12">
        <section className="px-4 pt-6 md:px-8" aria-label="Encabezado del reporte">
          <PortalPageHeader
            title="Fuentes de reclutamiento"
            description={
              <div className="space-y-3">
                <p>
                  Analizá qué canales atraen más candidatos y cuáles convierten mejor dentro del proceso.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 font-sans text-xs font-medium text-foreground">
                    {loading ? "…" : badgeCountLabel}
                  </span>
                </div>
              </div>
            }
            actions={
              <div className="flex w-full flex-wrap justify-end gap-2" data-report-pdf-exclude>
                <ReportesExportToolbar
                  reportSlug="fuentes-reclutamiento"
                  disabled={loading || !!error}
                  matrix={csvMatrix}
                />
              </div>
            }
            className="border-b border-border/80 pb-8"
          />
        </section>

        <section className="space-y-6 px-4 md:px-8" aria-label="Filtros del reporte" data-report-pdf-exclude>
          <ReportesFiltersPlaceholder
            legendLabel="Filtros del reporte"
            hintText="Ajustá el periodo, cliente, vacante o agrupación para analizar el rendimiento de las fuentes."
            controlsClassName="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <ReportesFilterControl label="Cliente" controlId="filtro-cliente-fr">
              <select
                id="filtro-cliente-fr"
                className={controlClass}
                value={draftClientId}
                onChange={(e) => setDraftClientId(e.target.value)}
              >
                <option value="">Todos</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </ReportesFilterControl>
            <ReportesFilterControl label="Vacante" controlId="filtro-vacante-fr">
              <select
                id="filtro-vacante-fr"
                className={controlClass}
                value={draftVacancyId}
                onChange={(e) => setDraftVacancyId(e.target.value)}
              >
                <option value="">Todas</option>
                {vacancies.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            </ReportesFilterControl>
            <ReportesFilterControl label="Agrupar por" controlId="filtro-groupby-fr">
              <select
                id="filtro-groupby-fr"
                className={controlClass}
                value={draftGroupBy}
                onChange={(e) =>
                  setDraftGroupBy(e.target.value === "vacancy" ? "vacancy" : "source")
                }
              >
                <option value="source">Fuente</option>
                <option value="vacancy">Vacante</option>
              </select>
            </ReportesFilterControl>
            <ReportesFilterControl label="Fuente (clave)" controlId="filtro-source-fr">
              <select
                id="filtro-source-fr"
                className={controlClass}
                value={draftSource}
                onChange={(e) => setDraftSource(e.target.value)}
              >
                <option value="">Todas</option>
                {sourceKeyOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </ReportesFilterControl>
            <ReportesFilterControl label="Desde (obligatorio)" controlId="filtro-desde-fr">
              <input
                id="filtro-desde-fr"
                type="date"
                required
                className={controlClass}
                value={draftDateFrom}
                onChange={(e) => setDraftDateFrom(e.target.value)}
              />
            </ReportesFilterControl>
            <ReportesFilterControl label="Hasta (obligatorio)" controlId="filtro-hasta-fr">
              <input
                id="filtro-hasta-fr"
                type="date"
                required
                className={controlClass}
                value={draftDateTo}
                onChange={(e) => setDraftDateTo(e.target.value)}
              />
            </ReportesFilterControl>
          </ReportesFiltersPlaceholder>
          <p className="font-sans text-xs text-muted-foreground" data-report-pdf-exclude>
            Las claves de fuente del desplegable se cargan con{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">GET …/reports/filters</code>{" "}
            según las fechas y el cliente seleccionados en el formulario.
          </p>
          <ReportesQueryActions
            statusText={statusLine}
            loading={loading}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            clearDisabled={loading}
            extra={null}
          />
        </section>

        <section
          className="space-y-3 px-4 md:px-8"
          aria-labelledby="reporte-fr-kpis-heading"
        >
          <div>
            <h2
              id="reporte-fr-kpis-heading"
              className="font-sans text-base font-semibold text-foreground"
            >
              KPIs del periodo
            </h2>
            <p className="mt-1 font-sans text-xs text-muted-foreground">{pageScopeNote}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <KpiCard
              title="Total de fuentes (filtro)"
              value={formatNumber(totalCount)}
              subtitle={totalCount > rows.length ? `En esta página: ${rows.length}` : undefined}
              icon={<Layers className="h-4 w-4 text-vo-purple" />}
              accentClassName="bg-vo-purple/10"
              loading={loading}
            />
            <KpiCard
              title="Candidatos"
              value={formatNumber(totalCandidatesPage)}
              icon={<Users className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />}
              accentClassName="bg-indigo-500/15"
              loading={loading}
            />
            <KpiCard
              title="Preseleccionados"
              value={formatNumber(totalPrePage)}
              icon={<UserCheck className="h-4 w-4 text-sky-600 dark:text-sky-300" />}
              accentClassName="bg-sky-500/15"
              loading={loading}
            />
            <KpiCard
              title="Entrevistados"
              value={formatNumber(totalIntPage)}
              icon={<CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-300" />}
              accentClassName="bg-amber-500/15"
              loading={loading}
            />
            <KpiCard
              title="Finalistas"
              value={formatNumber(totalFinPage)}
              icon={<Award className="h-4 w-4 text-violet-600 dark:text-violet-300" />}
              accentClassName="bg-violet-500/15"
              loading={loading}
            />
            <KpiCard
              title="Contratados"
              value={formatNumber(totalHiresPage)}
              subtitle={
                totalHiresPage === 0
                  ? "Estado informativo: aún no hay cierres en esta vista."
                  : undefined
              }
              icon={<Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />}
              accentClassName="bg-emerald-500/15"
              loading={loading}
            />
            <KpiCard
              title="Conversión promedio"
              value={formatPercent(avgConv)}
              subtitle={
                totalHiresPage === 0
                  ? "0.00% hasta que existan contrataciones con volumen."
                  : "Contratados / candidatos en filas visibles."
              }
              icon={<Percent className="h-4 w-4 text-muted-foreground" />}
              accentClassName="bg-muted"
              loading={loading}
            />
            <KpiCard
              title={best?.mode === "by_conversion" ? "Mejor fuente (conversión)" : "Mejor fuente (volumen)"}
              value={
                <span className="line-clamp-2 text-lg font-bold leading-snug">{bestLabel}</span>
              }
              icon={<Crown className="h-4 w-4 text-amber-600 dark:text-amber-300" />}
              accentClassName="bg-amber-500/10"
              loading={loading}
            />
          </div>
        </section>

        {!loading && !error && featured.length > 0 ? (
          <section className="space-y-3 px-4 md:px-8" aria-labelledby="reporte-fr-featured">
            <h2
              id="reporte-fr-featured"
              className="font-sans text-base font-semibold text-foreground"
            >
              Fuentes destacadas
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {featured.map((row, idx) => {
                const label = normalizeSourceLabel(row.sourceLabel, row.sourceKey ?? row.applicationSource)
                const stages = getPipelineStages(row)
                const maxP = Math.max(...stages.map((s) => s.value), 1)
                return (
                  <div
                    key={`${row.sourceKey ?? row.applicationSource ?? "src"}-${idx}`}
                    className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
                  >
                    <p className="font-sans text-sm font-semibold text-foreground">{label}</p>
                    <div className="mt-2 flex flex-wrap gap-2 font-sans text-xs text-muted-foreground">
                      <span>{formatNumber(row.candidatesCount)} candidatos</span>
                      <span>·</span>
                      <span>{formatNumber(row.hiresCount)} contratados</span>
                      <span>·</span>
                      <span>{formatPercent(Number(row.conversionPercent ?? 0))}</span>
                    </div>
                    <div className="mt-3 flex gap-0.5">
                      {stages.map((s) => (
                        <div
                          key={s.key}
                          className="h-1 flex-1 overflow-hidden rounded-sm bg-muted"
                          title={`${s.label}: ${s.value}`}
                        >
                          <div
                            className="h-full bg-vo-purple/70"
                            style={{ width: `${(s.value / maxP) * 100}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 font-sans text-[11px] leading-relaxed text-muted-foreground">
                      {featuredSourceMessage(row)}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="space-y-3 px-4 md:px-8" aria-labelledby="reporte-fr-funnel">
            <h2 id="reporte-fr-funnel" className="font-sans text-base font-semibold text-foreground">
              Embudo del periodo
            </h2>
            <div className="flex flex-col items-stretch gap-3 md:flex-row md:flex-wrap md:items-center">
              {funnelStages.map((s, i) => (
                <Fragment key={s.key}>
                  <div className="min-w-0 flex-1 md:min-w-[100px] md:max-w-[220px]">
                    <FunnelStageBlock
                      label={s.label}
                      value={s.value}
                      percentOfCandidates={s.key === "cand" ? 100 : s.pct}
                      isZero={s.value === 0}
                    />
                  </div>
                  {i < funnelStages.length - 1 ? (
                    <div
                      className="flex justify-center py-1 md:w-8 md:shrink-0 md:py-0"
                      aria-hidden
                    >
                      <ArrowRight className="h-5 w-5 text-muted-foreground md:hidden" />
                      <ChevronRight className="hidden h-6 w-6 text-muted-foreground md:block" />
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !error ? (
          <div className="grid gap-4 px-4 lg:grid-cols-2 md:px-8">
            <ReportesChartCard
              title="Participación por fuente"
              description="Distribución de candidatos según la etiqueta de cada canal en esta vista."
              headingId="reporte-fr-donut"
              minHeightClassName="min-h-[220px]"
            >
              {totalCandidatesPage <= 0 || pieByCandidates.length === 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/10 px-4 text-center">
                  <p className="font-sans text-sm font-medium text-foreground">Sin volumen de candidatos</p>
                  <p className="max-w-sm font-sans text-xs text-muted-foreground">
                    No hay candidatos para graficar con los filtros actuales. Probá ampliar fechas o cambiar cliente
                    o vacante.
                  </p>
                </div>
              ) : (
                <div className="flex h-full min-h-[240px] flex-col items-stretch gap-4 lg:flex-row lg:items-center">
                  <div className="mx-auto h-[220px] w-full max-w-[240px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieByCandidates}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={92}
                          paddingAngle={pieByCandidates.length > 1 ? 2 : 0}
                        >
                          {pieByCandidates.map((entry, index) => (
                            <Cell
                              key={`${entry.name}-${index}`}
                              fill={entry.fill ?? PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => {
                            const raw = Array.isArray(v) ? v[0] : v
                            return [formatNumber(Number(raw)), "Candidatos"]
                          }}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid var(--border)",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    {pieByCandidates.map((slice, i) => {
                      const row =
                        rows.find((r) => rowLabelForCharts(r, appliedGroupBy) === slice.name) ??
                        rows[i]
                      if (!row) return null
                      const pct = getSourceParticipation(row, totalCandidatesPage)
                      const label = normalizeSourceLabel(
                        row.sourceLabel,
                        row.sourceKey ?? row.applicationSource
                      )
                      return (
                        <div
                          key={slice.name}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: slice.fill }}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-sans text-sm font-medium text-foreground">{label}</p>
                              <p className="font-sans text-xs text-muted-foreground">
                                {formatNumber(slice.value)} candidatos · {formatPercent(pct)} del volumen
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </ReportesChartCard>

            <ReportesChartCard
              title="Ranking de fuentes por candidatos"
              description="Orden descendente por aportes de candidatos en las filas visibles."
              headingId="reporte-fr-rank"
              minHeightClassName="min-h-[220px]"
            >
              {candidatesBarData.length === 0 || totalCandidatesPage <= 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/10 px-4 text-center">
                  <p className="font-sans text-sm font-medium text-foreground">Sin datos para rankear</p>
                  <p className="max-w-sm font-sans text-xs text-muted-foreground">
                    Cuando exista actividad, verás barras horizontales por fuente.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={candidatesBarData}
                    layout="vertical"
                    margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      domain={[0, maxCandidatesBar]}
                    />
                    <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v) => [formatNumber(Number(v)), "Candidatos"]}
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as { fullName?: string } | undefined
                        return p?.fullName ?? ""
                      }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="candidatos" name="Candidatos" fill="#6E3385" radius={[0, 6, 6, 0]}>
                      {candidatesBarData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ReportesChartCard>
          </div>
        ) : loading ? (
          <div className="grid gap-4 px-4 lg:grid-cols-2 md:px-8">
            <div className="h-72 animate-pulse rounded-2xl border border-border bg-muted/30" />
            <div className="h-72 animate-pulse rounded-2xl border border-border bg-muted/30" />
          </div>
        ) : null}

        {!loading && !error ? (
          <section className="px-4 md:px-8" aria-labelledby="reporte-fr-conversion">
            <h2 id="reporte-fr-conversion" className="mb-3 font-sans text-base font-semibold text-foreground">
              Conversión por fuente
            </h2>
            {conversionsAllZero ? (
              <div className="rounded-2xl border border-border/80 bg-muted/10 p-6 shadow-sm">
                <p className="font-sans text-sm font-medium text-foreground">
                  Todavía no hay contrataciones registradas en el periodo seleccionado.
                </p>
                <p className="mt-2 max-w-xl font-sans text-sm text-muted-foreground">
                  Cuando existan contrataciones, aquí se mostrará la conversión por fuente con barras de progreso y
                  semáforos de desempeño.
                </p>
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm md:p-6">
                {rows.map((r, i) => {
                  const label = rowLabelForCharts(r, appliedGroupBy)
                  const pct = Math.min(100, Math.max(0, Number(r.conversionPercent ?? 0)))
                  const meta = getConversionTone(r.conversionPercent, r.hiresCount)
                  return (
                    <div key={`conv-${i}`} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-sans text-sm font-medium text-foreground">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-sm tabular-nums text-muted-foreground">
                            {formatPercent(Number(r.conversionPercent ?? 0))}
                          </span>
                          <span
                            className={[
                              "inline-flex rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium",
                              meta.badgeClassName,
                            ].join(" ")}
                          >
                            {meta.badgeLabel}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-vo-purple to-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ) : null}

        <section className="space-y-3 px-4 md:px-8" aria-label="Paginación" data-report-pdf-exclude>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              disabled={loading || page >= totalPages || totalCount === 0}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
            <span className="font-sans text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </span>
          </div>
        </section>

        <section className="px-4 md:px-8" aria-label="Tabla de performance">
          <h2 className="mb-3 font-sans text-base font-semibold text-foreground">Performance por fuente</h2>
          <ReportesDataTable<RecruitmentSourceRow>
            columns={columns}
            rows={rows}
            loading={loading}
            error={error}
            tableAriaLabel="Tabla del reporte fuentes de reclutamiento"
            getRowKey={(r, i) =>
              String(`${r.vacancyId ?? ""}-${r.sourceKey ?? r.applicationSource ?? "src"}-${i}`)
            }
            bodyRowClassName="hover:bg-muted/40"
            emptyDescription="No hay filas para los filtros seleccionados. Probá ampliar fechas o relajar criterios."
            onRetry={() => void loadReport()}
          />
        </section>
      </div>
    </RrhhReportsShell>
  )
}
