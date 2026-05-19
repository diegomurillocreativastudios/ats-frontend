"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Filter, RotateCcw } from "lucide-react"
import {
  AvanceVacantesPorClienteDashboard,
  buildAvanceVacantesTableColumns,
} from "@/components/rrhh/reportes/avance-vacantes-por-cliente-dashboard"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import ReportesDataTable from "@/components/rrhh/reportes/reportes-data-table"
import { ReportesExportToolbar } from "@/components/rrhh/reportes/reportes-export-toolbar"
import { ReportesFilterControl } from "@/components/rrhh/reportes/reportes-filters-placeholder"
import { DatePicker, datePickerFilterButtonClass } from "@/components/ui/date-picker"
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
  aggregateVacancyStatusByClient,
  computeAvanceVacantesDashboardKpis,
  formatPercent,
  getDaysOpen,
  getVacancyHealth,
  vacancyHealthLabel,
} from "@/lib/reportes-avance-vacantes-helpers"
import {
  formatReportDateOnly,
  formatVacancyStatusSlug,
} from "@/lib/reportes-display"
import { vacancyClientLabel, vacancyStageCounts } from "@/lib/reportes-metrics"

const controlClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 font-sans text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple/40 disabled:opacity-60"

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

const DEFAULT_SORT_BY = "openedAt"
const DEFAULT_SORT_DIR = "desc" as const

function formatScore0to100(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—"
  return `${Number(n).toFixed(0)}%`
}

function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "—"
  return String(Math.round(Number(n)))
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
  const [draftSortBy, setDraftSortBy] = useState(DEFAULT_SORT_BY)
  const [draftSortDirection, setDraftSortDirection] = useState<"asc" | "desc">(DEFAULT_SORT_DIR)

  const [appliedClientId, setAppliedClientId] = useState("")
  const [appliedVacancyId, setAppliedVacancyId] = useState("")
  const [appliedVacancyStatus, setAppliedVacancyStatus] = useState("")
  const [appliedDateFrom, setAppliedDateFrom] = useState("")
  const [appliedDateTo, setAppliedDateTo] = useState("")
  const [appliedSortBy, setAppliedSortBy] = useState(DEFAULT_SORT_BY)
  const [appliedSortDirection, setAppliedSortDirection] = useState<"asc" | "desc">(DEFAULT_SORT_DIR)

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

  const handleClearFilters = () => {
    setDraftClientId("")
    setDraftVacancyId("")
    setDraftVacancyStatus("")
    setDraftDateFrom("")
    setDraftDateTo("")
    setDraftSortBy(DEFAULT_SORT_BY)
    setDraftSortDirection(DEFAULT_SORT_DIR)
    setAppliedClientId("")
    setAppliedVacancyId("")
    setAppliedVacancyStatus("")
    setAppliedDateFrom("")
    setAppliedDateTo("")
    setAppliedSortBy(DEFAULT_SORT_BY)
    setAppliedSortDirection(DEFAULT_SORT_DIR)
    setPage(1)
  }

  const hasActiveFilters = useMemo(() => {
    if (appliedClientId || appliedVacancyId || appliedVacancyStatus) return true
    if (appliedDateFrom || appliedDateTo) return true
    if (appliedSortBy !== DEFAULT_SORT_BY || appliedSortDirection !== DEFAULT_SORT_DIR) return true
    return false
  }, [
    appliedClientId,
    appliedVacancyId,
    appliedVacancyStatus,
    appliedDateFrom,
    appliedDateTo,
    appliedSortBy,
    appliedSortDirection,
  ])

  const kpis = useMemo(
    () => computeAvanceVacantesDashboardKpis(rows, totalCount),
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
      "Días (apertura–cierre o hoy)",
      "% Avance",
      "Match IA promedio",
      "Match IA máx",
      "Match IA mín",
      "Con análisis preliminar",
    ]
    const body = rows.map((r) => {
      const sc = vacancyStageCounts(r)
      const fmt = (n: number | null) => (n == null ? "—" : String(n))
      return [
        vacancyClientLabel(r),
        r.vacancyTitle ?? "",
        formatVacancyStatusSlug(r.vacancyStatus),
        vacancyHealthLabel(getVacancyHealth(r)),
        String(r.totalCandidates ?? ""),
        fmt(sc.interview),
        fmt(sc.finalist),
        fmt(sc.hired),
        formatReportDateOnly(r.openedAt),
        formatReportDateOnly(r.closedAt),
        (() => {
          const d = getDaysOpen(r)
          return d == null ? "—" : String(d)
        })(),
        formatPercent(r.averageApplicationProgressPercent ?? r.progressPercent),
        formatScore0to100(r.averagePreliminaryMatchScore ?? undefined),
        formatScore0to100(r.maxPreliminaryMatchScore ?? undefined),
        formatScore0to100(r.minPreliminaryMatchScore ?? undefined),
        formatCount(r.candidatesWithPreliminaryAnalysis ?? undefined),
      ]
    })
    return [header, ...body]
  }, [rows])

  const columns = useMemo(() => buildAvanceVacantesTableColumns(), [])

  const statusLine =
    !loading && !error && totalCount > 0
      ? `Mostrando ${showingFrom}–${showingTo} de ${totalCount}`
      : !loading && !error
        ? `${totalCount} ${totalCount === 1 ? "fila" : "filas"}`
        : ""

  const mainContent = (
    <div className="min-w-0 flex flex-col gap-6 bg-linear-to-b from-violet-50/40 via-background to-background pb-8">
      <section
        className="border-b border-border/60 px-4 pt-6 md:px-8"
        aria-label="Encabezado del reporte"
      >
        <div className="flex flex-col gap-6 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl space-y-2">
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-vo-purple">
              Reporte RRHH · ATS
            </p>
            <h1 className="font-sans text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Avance de vacantes por cliente
            </h1>
            <p className="font-sans text-sm text-muted-foreground md:text-base">
              Monitorea el avance de vacantes por cliente, candidatos asociados, estado del proceso y
              desempeño del análisis preliminar con IA.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2" data-report-pdf-exclude>
            <ReportesExportToolbar
              reportSlug="avance-vacantes-por-cliente"
              disabled={loading || !!error}
              matrix={csvMatrix}
            />
            <button
              type="button"
              onClick={handleApplyFilters}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white shadow-sm transition-colors hover:bg-vo-purple-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:opacity-60"
            >
              <Filter className="h-4 w-4 shrink-0" aria-hidden />
              Aplicar filtros
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={loading || !hasActiveFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple/30 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
              Limpiar filtros
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4 px-4 md:px-8" aria-label="Contenido del reporte">
        <div
          className="rounded-2xl border border-border/80 bg-card/95 p-5 shadow-sm sm:p-6"
          data-report-pdf-exclude
          aria-label="Filtros del reporte"
        >
          <h2 className="font-sans text-base font-semibold text-foreground">Filtros del reporte</h2>
          <p className="mt-1 max-w-3xl font-sans text-xs text-muted-foreground">
            Los valores se envían como parámetros al API de reportes. Las columnas de entrevista /
            finalistas / contratados usan totales del API o, si viene{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">candidatesByStage</code>,
            heurística por nombre de etapa.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <DatePicker
                id="filtro-desde"
                value={draftDateFrom}
                onChange={setDraftDateFrom}
                ariaLabel="Desde"
                buttonClassName={datePickerFilterButtonClass}
                wrapperClassName="relative w-full"
              />
            </ReportesFilterControl>
            <ReportesFilterControl label="Hasta" controlId="filtro-hasta">
              <DatePicker
                id="filtro-hasta"
                value={draftDateTo}
                onChange={setDraftDateTo}
                ariaLabel="Hasta"
                buttonClassName={datePickerFilterButtonClass}
                wrapperClassName="relative w-full"
              />
            </ReportesFilterControl>
          </div>
          <div className="mt-5 flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-sans text-xs text-muted-foreground" aria-live="polite">
              {statusLine}
            </p>
          </div>
        </div>

        {error ? (
          <div
            className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-4 shadow-sm"
            role="alert"
          >
            <p className="font-sans text-sm font-medium text-destructive">{error}</p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              Revisá la conexión o probá de nuevo en unos minutos.
            </p>
          </div>
        ) : null}

        <AvanceVacantesPorClienteDashboard
          rows={rows}
          loading={loading}
          kpis={kpis}
          chartByClient={chartData}
          chartIsPageScoped={chartIsPageScoped}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm" data-report-pdf-exclude>
          <button
            type="button"
            className="rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <button
            type="button"
            className="rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            disabled={loading || page >= totalPages || totalCount === 0}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
          <span className="font-sans text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="font-sans text-lg font-semibold text-foreground">Detalle por vacante</h2>
          <ReportesDataTable<VacancyProgressByClientRow>
            columns={columns}
            rows={rows}
            loading={loading}
            error={error}
            showEmbeddedError={false}
            tableAriaLabel="Tabla del reporte avance vacantes por cliente"
            getRowKey={(r, i) =>
              String(r.vacancyId ?? `${r.clientId}-${i}-${r.vacancyTitle}`)
            }
          />
        </div>
      </section>
    </div>
  )

  return (
    <RrhhReportsShell breadcrumbLabel="Reportes" breadcrumbTrail={trail}>
      {mainContent}
    </RrhhReportsShell>
  )
}
