"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { ReportesKpiStrip } from "@/components/rrhh/reportes/reportes-kpi-strip"
import { ReportesChartCard } from "@/components/rrhh/reportes/reportes-chart-card"
import { ReportesExportToolbar } from "@/components/rrhh/reportes/reportes-export-toolbar"
import { ReportesQueryActions } from "@/components/rrhh/reportes/reportes-query-actions"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  fetchVacancyProgressByClient,
  listRecruiterCompanies,
  listRecruiterVacancies,
  type RecruiterCompanyOption,
  type RecruiterVacancyOption,
  type VacancyProgressByClientRow,
} from "@/lib/api/recruiter-reports"
import {
  formatPercent,
  formatReportDateOnly,
  formatVacancyStatusSlug,
} from "@/lib/reportes-display"
import {
  aggregateVacancyStatusByClient,
  computeVacancyProgressKpis,
  sumCandidatesByStageHints,
  vacancyClientLabel,
  vacancyDaysOpen,
  vacancyTrafficLight,
  type VacancyTrafficLight,
} from "@/lib/reportes-metrics"

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

const PAGE_SIZE = 20

const VACANCY_STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "open", label: "Abierta" },
  { value: "closed", label: "Cerrada" },
  { value: "draft", label: "Borrador" },
  { value: "paused", label: "Pausada" },
] as const

const SORT_BY_OPTIONS = [
  { value: "openedAt", label: "Fecha apertura" },
  { value: "vacancyTitle", label: "Vacante" },
  { value: "clientName", label: "Cliente" },
  { value: "vacancyStatus", label: "Estado" },
  { value: "totalCandidates", label: "Candidatos" },
] as const

const COLOR_OPEN = "#6E3385"
const COLOR_CLOSED = "#496FB3"
const COLOR_PAUSED = "#CA8A04"
const COLOR_DRAFT = "#94A3B8"

function formatScore0to100(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—"
  return `${Number(n).toFixed(0)}%`
}

function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—"
  return String(Math.round(Number(n)))
}

function TrafficLightBadge({ light }: { light: VacancyTrafficLight }) {
  const cfg: Record<
    VacancyTrafficLight,
    { label: string; dot: string; caption: string }
  > = {
    green: {
      label: "Verde",
      dot: "bg-emerald-500",
      caption: "Avance adecuado",
    },
    amber: {
      label: "Amarillo",
      dot: "bg-amber-400",
      caption: "Poco movimiento o lento",
    },
    red: {
      label: "Rojo",
      dot: "bg-red-500",
      caption: "Atrasada o sin candidatos",
    },
    neutral: {
      label: "—",
      dot: "bg-muted-foreground/40",
      caption: "No aplica",
    },
  }
  const c = cfg[light]
  return (
    <span className="inline-flex items-center gap-2" title={c.caption}>
      <span className="sr-only">
        Semáforo: {c.label}. {c.caption}
      </span>
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`}
        aria-hidden
      />
      <span className="font-sans text-xs text-muted-foreground">{c.caption}</span>
    </span>
  )
}

function stageCountsForRow(r: VacancyProgressByClientRow): {
  interview: number | null
  finalist: number | null
  hired: number | null
} {
  const explicitI = r.candidatesInInterview
  const explicitF = r.candidatesFinalist
  const explicitH = r.candidatesHired
  if (
    typeof explicitI === "number" ||
    typeof explicitF === "number" ||
    typeof explicitH === "number"
  ) {
    return {
      interview: typeof explicitI === "number" ? explicitI : null,
      finalist: typeof explicitF === "number" ? explicitF : null,
      hired: typeof explicitH === "number" ? explicitH : null,
    }
  }
  const hints = sumCandidatesByStageHints(r.candidatesByStage)
  const hasMap = r.candidatesByStage && Object.keys(r.candidatesByStage).length > 0
  if (!hasMap) return { interview: null, finalist: null, hired: null }
  return {
    interview: hints.interview,
    finalist: hints.finalist,
    hired: hints.hired,
  }
}

export default function ReporteAvanceVacantesPorClientePage() {
  const trail = [
    { label: "Reportes", href: "/portal-rrhh/reportes" },
    { label: "Avance vacantes por cliente" },
  ]

  const [companies, setCompanies] = useState<RecruiterCompanyOption[]>([])
  const [vacancies, setVacancies] = useState<RecruiterVacancyOption[]>([])

  const [draftClientId, setDraftClientId] = useState("")
  const [draftVacancyId, setDraftVacancyId] = useState("")
  const [draftVacancyStatus, setDraftVacancyStatus] = useState("")
  const [draftDateFrom, setDraftDateFrom] = useState("")
  const [draftDateTo, setDraftDateTo] = useState("")
  const [draftSortBy, setDraftSortBy] = useState("openedAt")
  const [draftSortDirection, setDraftSortDirection] = useState<"asc" | "desc">("desc")

  const [appliedClientId, setAppliedClientId] = useState("")
  const [appliedVacancyId, setAppliedVacancyId] = useState("")
  const [appliedVacancyStatus, setAppliedVacancyStatus] = useState("")
  const [appliedDateFrom, setAppliedDateFrom] = useState("")
  const [appliedDateTo, setAppliedDateTo] = useState("")
  const [appliedSortBy, setAppliedSortBy] = useState("openedAt")
  const [appliedSortDirection, setAppliedSortDirection] = useState<"asc" | "desc">("desc")

  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<VacancyProgressByClientRow[]>([])
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

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchVacancyProgressByClient({
        clientId: appliedClientId || undefined,
        vacancyStatus: appliedVacancyStatus || undefined,
        vacancyId: appliedVacancyId || undefined,
        dateFrom: appliedDateFrom || undefined,
        dateTo: appliedDateTo || undefined,
        page,
        pageSize: PAGE_SIZE,
        sortBy: appliedSortBy || undefined,
        sortDirection: appliedSortDirection,
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
    appliedVacancyStatus,
    appliedVacancyId,
    appliedDateFrom,
    appliedDateTo,
    appliedSortBy,
    appliedSortDirection,
    page,
  ])

  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleApplyFilters = () => {
    setAppliedClientId(draftClientId)
    setAppliedVacancyId(draftVacancyId)
    setAppliedVacancyStatus(draftVacancyStatus)
    setAppliedDateFrom(draftDateFrom)
    setAppliedDateTo(draftDateTo)
    setAppliedSortBy(draftSortBy)
    setAppliedSortDirection(draftSortDirection)
    setPage(1)
  }

  const kpis = useMemo(
    () => computeVacancyProgressKpis(rows, totalCount),
    [rows, totalCount]
  )
  const chartData = useMemo(() => aggregateVacancyStatusByClient(rows), [rows])
  const chartIsPageScoped = totalCount > rows.length

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, totalCount)

  const csvMatrix = useMemo(() => {
    const header = [
      "Cliente",
      "Vacante",
      "Estado",
      "Semáforo",
      "Candidatos",
      "En entrevista",
      "Finalistas",
      "Contratados",
      "Apertura",
      "Cierre",
      "Días abierta",
      "% Avance",
      "Match IA promedio",
      "Match IA máx",
      "Match IA mín",
      "Con análisis preliminar",
    ]
    const body = rows.map((r) => {
      const sc = stageCountsForRow(r)
      const fmt = (n: number | null) =>
        n == null ? "—" : String(n)
      return [
        vacancyClientLabel(r),
        r.vacancyTitle ?? "",
        formatVacancyStatusSlug(r.vacancyStatus),
        vacancyTrafficLight(r),
        String(r.totalCandidates ?? ""),
        fmt(sc.interview),
        fmt(sc.finalist),
        fmt(sc.hired),
        formatReportDateOnly(r.openedAt),
        formatReportDateOnly(r.closedAt),
        (() => {
          const d = vacancyDaysOpen(r)
          return d == null ? "—" : String(d)
        })(),
        formatPercent(
          r.averageApplicationProgressPercent ?? r.progressPercent
        ),
        formatScore0to100(r.averagePreliminaryMatchScore ?? undefined),
        formatScore0to100(r.maxPreliminaryMatchScore ?? undefined),
        formatScore0to100(r.minPreliminaryMatchScore ?? undefined),
        formatCount(r.candidatesWithPreliminaryAnalysis ?? undefined),
      ]
    })
    return [header, ...body]
  }, [rows])

  const columns = [
    {
      header: "Cliente",
      render: (r: VacancyProgressByClientRow) => vacancyClientLabel(r),
    },
    {
      header: "Vacante",
      render: (r: VacancyProgressByClientRow) => r.vacancyTitle ?? "—",
    },
    {
      header: "Estado",
      render: (r: VacancyProgressByClientRow) =>
        formatVacancyStatusSlug(r.vacancyStatus),
    },
    {
      header: "Semáforo",
      render: (r: VacancyProgressByClientRow) => (
        <TrafficLightBadge light={vacancyTrafficLight(r)} />
      ),
    },
    {
      header: "Candidatos",
      numeric: true,
      render: (r: VacancyProgressByClientRow) =>
        r.totalCandidates != null ? String(r.totalCandidates) : "—",
    },
    {
      header: "En entrevista",
      numeric: true,
      render: (r: VacancyProgressByClientRow) => {
        const v = stageCountsForRow(r).interview
        return v == null ? "—" : String(v)
      },
    },
    {
      header: "Finalistas",
      numeric: true,
      render: (r: VacancyProgressByClientRow) => {
        const v = stageCountsForRow(r).finalist
        return v == null ? "—" : String(v)
      },
    },
    {
      header: "Contratados",
      numeric: true,
      render: (r: VacancyProgressByClientRow) => {
        const v = stageCountsForRow(r).hired
        return v == null ? "—" : String(v)
      },
    },
    {
      header: "Fecha apertura",
      render: (r: VacancyProgressByClientRow) =>
        formatReportDateOnly(r.openedAt),
    },
    {
      header: "Días abierta",
      numeric: true,
      render: (r: VacancyProgressByClientRow) => {
        const d = vacancyDaysOpen(r)
        return d == null ? "—" : String(d)
      },
    },
    {
      header: "Cierre",
      render: (r: VacancyProgressByClientRow) =>
        formatReportDateOnly(r.closedAt),
    },
    {
      header: "% Avance",
      numeric: true,
      render: (r: VacancyProgressByClientRow) =>
        formatPercent(
          r.averageApplicationProgressPercent ?? r.progressPercent
        ),
    },
    {
      header: "Match IA Ø",
      numeric: true,
      render: (r: VacancyProgressByClientRow) =>
        formatScore0to100(r.averagePreliminaryMatchScore ?? undefined),
    },
    {
      header: "Match IA máx",
      numeric: true,
      render: (r: VacancyProgressByClientRow) =>
        formatScore0to100(r.maxPreliminaryMatchScore ?? undefined),
    },
    {
      header: "Match IA mín",
      numeric: true,
      render: (r: VacancyProgressByClientRow) =>
        formatScore0to100(r.minPreliminaryMatchScore ?? undefined),
    },
    {
      header: "Con análisis IA",
      numeric: true,
      render: (r: VacancyProgressByClientRow) =>
        formatCount(r.candidatesWithPreliminaryAnalysis ?? undefined),
    },
  ] as const

  const kpiItems = [
    {
      label: "Vacantes (total filtros)",
      value: loading ? "—" : kpis.totalVacancies,
      helper:
        !loading && kpis.vacanciesOnPage < kpis.totalVacancies
          ? `Página: ${kpis.vacanciesOnPage} de ${kpis.totalVacancies}`
          : undefined,
    },
    {
      label: "Abiertas (pág.)",
      value: loading ? "—" : kpis.openCount,
    },
    {
      label: "Cerradas (pág.)",
      value: loading ? "—" : kpis.closedCount,
    },
    {
      label: "En pausa (pág.)",
      value: loading ? "—" : kpis.pausedCount,
    },
    {
      label: "Candidatos (suma pág.)",
      value: loading ? "—" : kpis.totalCandidates,
    },
    {
      label: "% avance medio (pág.)",
      value:
        loading || kpis.avgProgressPercent == null
          ? "—"
          : `${kpis.avgProgressPercent.toFixed(1)}%`,
    },
    {
      label: "Match IA medio (pág.)",
      value:
        loading || kpis.avgPreliminaryMatchOnPage == null
          ? "—"
          : `${kpis.avgPreliminaryMatchOnPage.toFixed(0)}%`,
    },
  ] as const

  const statusLine =
    !loading && !error && totalCount > 0
      ? `Mostrando ${showingFrom}–${showingTo} de ${totalCount}`
      : !loading && !error
        ? `${totalCount} ${totalCount === 1 ? "fila" : "filas"}`
        : ""

  const mainContent = (
    <div className="min-w-0 flex flex-col gap-6 pb-6">
      <section className="px-4 pt-6 md:px-8" aria-label="Encabezado del reporte">
        <PortalPageHeader
          title="Avance vacantes por cliente"
          description="Control general de procesos activos: vacantes por cliente, volumen de candidatos, semáforo heurístico y métricas de matching preliminar (0–100) cuando el API las envíe."
        />
      </section>
      <section className="space-y-4 px-4 md:px-8" aria-label="Filtros y tabla del reporte">
        <ReportesFiltersPlaceholder>
          <ReportesFilterControl label="Cliente" controlId="filtro-cliente">
            <select
              id="filtro-cliente"
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
          <ReportesFilterControl label="Vacante" controlId="filtro-vacante-av">
            <select
              id="filtro-vacante-av"
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
          <ReportesFilterControl label="Estado de vacante" controlId="filtro-estado">
            <select
              id="filtro-estado"
              className={controlClass}
              value={draftVacancyStatus}
              onChange={(e) => setDraftVacancyStatus(e.target.value)}
            >
              {VACANCY_STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </ReportesFilterControl>
          <ReportesFilterControl label="Ordenar por" controlId="filtro-sort-by">
            <select
              id="filtro-sort-by"
              className={controlClass}
              value={draftSortBy}
              onChange={(e) => setDraftSortBy(e.target.value)}
            >
              {SORT_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </ReportesFilterControl>
          <ReportesFilterControl label="Dirección" controlId="filtro-sort-dir">
            <select
              id="filtro-sort-dir"
              className={controlClass}
              value={draftSortDirection}
              onChange={(e) =>
                setDraftSortDirection(e.target.value === "asc" ? "asc" : "desc")
              }
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </ReportesFilterControl>
          <ReportesFilterControl label="Desde" controlId="filtro-desde">
            <input
              id="filtro-desde"
              type="date"
              className={controlClass}
              value={draftDateFrom}
              onChange={(e) => setDraftDateFrom(e.target.value)}
            />
          </ReportesFilterControl>
          <ReportesFilterControl label="Hasta" controlId="filtro-hasta">
            <input
              id="filtro-hasta"
              type="date"
              className={controlClass}
              value={draftDateTo}
              onChange={(e) => setDraftDateTo(e.target.value)}
            />
          </ReportesFilterControl>
        </ReportesFiltersPlaceholder>
        <p className="font-sans text-xs text-muted-foreground">
          Las columnas de entrevista / finalistas / contratados usan totales del API o, si viene{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">candidatesByStage</code>, heurística por nombre de etapa.
          Los KPIs de estado y candidatos refieren a la página actual; el total de vacantes viene del API.
        </p>
        <ReportesQueryActions
          statusText={statusLine}
          loading={loading}
          onApply={handleApplyFilters}
          extra={
            <ReportesExportToolbar
              reportSlug="avance-vacantes-por-cliente"
              disabled={loading || !!error}
              matrix={csvMatrix}
            />
          }
        />
        {!loading && !error ? (
          <ReportesKpiStrip
            headingId="reporte-av-vac-kpis"
            title="Indicadores"
            items={[...kpiItems]}
            columnsClassName="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7"
          />
        ) : null}
        {!loading && !error && chartData.length > 0 ? (
          <ReportesChartCard
            title="Vacantes por cliente y estado"
            description={
              chartIsPageScoped
                ? "Barras según vacantes en esta página (la paginación no agrega todo el conjunto)."
                : "Barras agrupadas: abiertas, cerradas, en pausa y borrador."
            }
            headingId="reporte-av-vac-chart"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 4, bottom: 56 }}
                barCategoryGap="16%"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="clientLabel"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground, #6B7280)" }}
                  interval={0}
                  angle={-24}
                  textAnchor="end"
                  height={64}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground, #6B7280)" }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
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
          </ReportesChartCard>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground hover:bg-muted disabled:opacity-50"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground hover:bg-muted disabled:opacity-50"
            disabled={loading || page >= totalPages || totalCount === 0}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
          <span className="font-sans text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </span>
        </div>
        <ReportesDataTable<VacancyProgressByClientRow>
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          tableAriaLabel="Tabla del reporte avance vacantes por cliente"
          getRowKey={(r, i) =>
            String(r.vacancyId ?? `${r.clientId}-${i}-${r.vacancyTitle}`)
          }
        />
      </section>
    </div>
  )

  return (
    <RrhhReportsShell breadcrumbLabel="Reportes" breadcrumbTrail={trail}>
      {mainContent}
    </RrhhReportsShell>
  )
}
