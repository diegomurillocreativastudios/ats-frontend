"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import ReportesFiltersPlaceholder, {
  ReportesFilterControl,
} from "@/components/rrhh/reportes/reportes-filters-placeholder"
import ReportesDataTable from "@/components/rrhh/reportes/reportes-data-table"
import { ReportesKpiStrip } from "@/components/rrhh/reportes/reportes-kpi-strip"
import { ReportesChartCard } from "@/components/rrhh/reportes/reportes-chart-card"
import {
  ReportesAlertsPanel,
  type ReportesAlertItem,
} from "@/components/rrhh/reportes/reportes-alerts-panel"
import { ReportesExportToolbar } from "@/components/rrhh/reportes/reportes-export-toolbar"
import { ReportesQueryActions } from "@/components/rrhh/reportes/reportes-query-actions"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  fetchCandidateStatusByStage,
  listRecruiterCompanies,
  listRecruiterStages,
  listRecruiterVacancies,
  tryFetchCandidatePipelineSummary,
  type CandidatePipelineSummary,
  type CandidateStatusByStageRow,
  type RecruiterCompanyOption,
  type RecruiterStageOption,
  type RecruiterVacancyOption,
} from "@/lib/api/recruiter-reports"
import { formatReportDate } from "@/lib/reportes-display"
import { displayCompanyOrClientLabel } from "@/lib/public-company-display"
import {
  REPORTES_STALE_CANDIDATE_DAYS,
  candidateDaysSinceLastMove,
  candidateStageLabel,
  countCandidatesByStageOnPage,
} from "@/lib/reportes-metrics"

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

const PAGE_SIZE = 20
const FUNNEL_COLOR = "#6E3385"
const PIE_COLORS = ["#6E3385", "#496FB3", "#CA8A04", "#059669", "#7C3AED", "#DB2777", "#0EA5E9"]

export default function ReporteEstatusCandidatosPorEtapaPage() {
  const trail = [
    { label: "Reportes", href: "/portal-rrhh/reportes" },
    { label: "Estatus candidatos por etapa" },
  ]

  const [companies, setCompanies] = useState<RecruiterCompanyOption[]>([])
  const [vacancies, setVacancies] = useState<RecruiterVacancyOption[]>([])
  const [stages, setStages] = useState<RecruiterStageOption[]>([])
  const [stagesLoading, setStagesLoading] = useState(false)

  const [draftClientId, setDraftClientId] = useState("")
  const [draftVacancyId, setDraftVacancyId] = useState("")
  const [draftStageId, setDraftStageId] = useState("")
  const [draftDateFrom, setDraftDateFrom] = useState("")
  const [draftDateTo, setDraftDateTo] = useState("")

  const [appliedClientId, setAppliedClientId] = useState("")
  const [appliedVacancyId, setAppliedVacancyId] = useState("")
  const [appliedStageId, setAppliedStageId] = useState("")
  const [appliedDateFrom, setAppliedDateFrom] = useState("")
  const [appliedDateTo, setAppliedDateTo] = useState("")

  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<CandidateStatusByStageRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pipelineSummary, setPipelineSummary] =
    useState<CandidatePipelineSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

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
    if (!draftClientId.trim()) {
      setStages([])
      setDraftStageId("")
      return
    }
    let cancelled = false
    const run = async () => {
      setStagesLoading(true)
      try {
        const list = await listRecruiterStages(draftClientId)
        if (!cancelled) setStages(list)
      } catch {
        if (!cancelled) setStages([])
      } finally {
        if (!cancelled) setStagesLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [draftClientId])

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCandidateStatusByStage({
        clientId: appliedClientId || undefined,
        vacancyId: appliedVacancyId || undefined,
        stageId: appliedStageId || undefined,
        dateFrom: appliedDateFrom || undefined,
        dateTo: appliedDateTo || undefined,
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
    appliedStageId,
    appliedDateFrom,
    appliedDateTo,
    page,
  ])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setSummaryLoading(true)
      try {
        const s = await tryFetchCandidatePipelineSummary({
          clientId: appliedClientId || undefined,
          vacancyId: appliedVacancyId || undefined,
          stageId: appliedStageId || undefined,
          dateFrom: appliedDateFrom || undefined,
          dateTo: appliedDateTo || undefined,
        })
        if (!cancelled) setPipelineSummary(s)
      } finally {
        if (!cancelled) setSummaryLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    appliedClientId,
    appliedVacancyId,
    appliedStageId,
    appliedDateFrom,
    appliedDateTo,
  ])

  const handleApplyFilters = () => {
    setAppliedClientId(draftClientId)
    setAppliedVacancyId(draftVacancyId)
    setAppliedStageId(draftStageId)
    setAppliedDateFrom(draftDateFrom)
    setAppliedDateTo(draftDateTo)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, totalCount)

  const funnelChartRows = useMemo(() => {
    if (pipelineSummary && pipelineSummary.byStage.length > 0) {
      return pipelineSummary.byStage
        .filter((s) => s.count > 0)
        .map((s) => ({
          name: s.stageName,
          count: s.count,
          stagePercent: s.percent,
        }))
    }
    return countCandidatesByStageOnPage(rows).map((s) => ({
      name: s.stageName,
      count: s.count,
      stagePercent: undefined as number | undefined,
    }))
  }, [pipelineSummary, rows])

  const pieDistribution = useMemo(
    () =>
      funnelChartRows.map((r, i) => ({
        name: r.name,
        value: r.count,
        fill: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [funnelChartRows]
  )

  const staleCount = useMemo(() => {
    return rows.filter((r) => {
      const d = candidateDaysSinceLastMove(r)
      return d != null && d >= REPORTES_STALE_CANDIDATE_DAYS
    }).length
  }, [rows])

  const alerts = useMemo((): ReportesAlertItem[] => {
    const out: ReportesAlertItem[] = []
    rows.forEach((r, i) => {
      const d = candidateDaysSinceLastMove(r)
      if (d != null && d >= REPORTES_STALE_CANDIDATE_DAYS) {
        out.push({
          id: `stale-${r.candidateProfileId ?? i}`,
          severity: "warning",
          message: `${r.candidateName ?? "Candidato"} lleva ${d} días sin moverse (${candidateStageLabel(r)}).`,
        })
      }
    })
    return out.slice(0, 15)
  }, [rows])

  const responsible = (r: CandidateStatusByStageRow) =>
    r.ownerName ?? r.recruiterName ?? "—"

  const clientLabel = (r: CandidateStatusByStageRow) =>
    displayCompanyOrClientLabel(r.clientName, r.companyName)

  const columns = [
    {
      header: "Candidato",
      render: (r: CandidateStatusByStageRow) => r.candidateName ?? "—",
    },
    {
      header: "Vacante",
      render: (r: CandidateStatusByStageRow) => r.vacancyTitle ?? "—",
    },
    {
      header: "Cliente",
      render: (r: CandidateStatusByStageRow) => clientLabel(r),
    },
    {
      header: "Etapa actual",
      render: (r: CandidateStatusByStageRow) => candidateStageLabel(r),
    },
    {
      header: "Días en etapa",
      numeric: true,
      render: (r: CandidateStatusByStageRow) =>
        r.daysInStage != null && !Number.isNaN(Number(r.daysInStage))
          ? String(r.daysInStage)
          : (() => {
              const d = candidateDaysSinceLastMove(r)
              return d == null ? "—" : String(d)
            })(),
    },
    {
      header: "Estatus",
      render: (r: CandidateStatusByStageRow) =>
        r.pipelineStatus ?? r.applicationStatus ?? "—",
    },
    {
      header: "Última actualización",
      render: (r: CandidateStatusByStageRow) =>
        formatReportDate(r.lastMovedAt),
    },
    {
      header: "Responsable",
      render: (r: CandidateStatusByStageRow) => responsible(r),
    },
  ] as const

  const csvMatrix = useMemo(() => {
    const header = [
      "Candidato",
      "Vacante",
      "Cliente",
      "Etapa actual",
      "Días en etapa",
      "Estatus",
      "Última actualización",
      "Responsable",
    ]
    const body = rows.map((r) => {
      const dIn =
        r.daysInStage != null && !Number.isNaN(Number(r.daysInStage))
          ? String(r.daysInStage)
          : (() => {
              const d = candidateDaysSinceLastMove(r)
              return d == null ? "" : String(d)
            })()
      return [
        r.candidateName ?? "",
        r.vacancyTitle ?? "",
        clientLabel(r),
        candidateStageLabel(r),
        dIn,
        r.pipelineStatus ?? r.applicationStatus ?? "",
        formatReportDate(r.lastMovedAt),
        responsible(r),
      ]
    })
    return [header, ...body]
  }, [rows])

  const globalTotal =
    pipelineSummary && pipelineSummary.totalCandidates > 0
      ? pipelineSummary.totalCandidates
      : totalCount

  const kpiItems = [
    {
      label: "Candidatos (total bajo filtros)",
      value: loading ? "—" : globalTotal,
      helper:
        pipelineSummary && pipelineSummary.totalCandidates > 0
          ? "Incluye agregado del API summary"
          : "Basado en totalCount del listado paginado",
    },
    {
      label: "En esta página",
      value: loading ? "—" : rows.length,
    },
    {
      label: "Etapas en vista embudo",
      value: loading ? "—" : funnelChartRows.length,
    },
    {
      label: "Posibles estancados (pág.)",
      value: loading ? "—" : staleCount,
      helper: `≥ ${REPORTES_STALE_CANDIDATE_DAYS} días sin movimiento`,
    },
  ] as const

  const statusLine =
    !loading && !error && totalCount > 0
      ? `Mostrando ${showingFrom}–${showingTo} de ${totalCount}${summaryLoading ? " · cargando agregados…" : ""}`
      : !loading && !error
        ? `${totalCount} ${totalCount === 1 ? "fila" : "filas"}`
        : ""

  const funnelDescription =
    pipelineSummary && pipelineSummary.byStage.length > 0
      ? "Distribución global por etapa (endpoint summary). Embudo visual aproximado con barras horizontales."
      : "Distribución calculada solo con la página actual. Para totales reales, el backend puede exponer GET …/candidate-status-by-stage/summary."

  const mainContent = (
    <div className="min-w-0 flex flex-col gap-6 pb-10">
      <section className="px-4 pt-6 md:px-8" aria-label="Encabezado del reporte">
        <PortalPageHeader
          title="Estatus candidatos por etapa"
          description="Embudo del proceso: dónde está cada candidato, alertas por estancamiento y vista agregada cuando el API lo permita."
        />
      </section>
      <section className="space-y-4 px-4 md:px-8" aria-label="Filtros y tabla del reporte">
        <ReportesFiltersPlaceholder>
          <ReportesFilterControl label="Cliente" controlId="filtro-cliente-ec">
            <select
              id="filtro-cliente-ec"
              className={controlClass}
              value={draftClientId}
              onChange={(e) => {
                setDraftClientId(e.target.value)
                setDraftStageId("")
              }}
            >
              <option value="">Todos</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </ReportesFilterControl>
          <ReportesFilterControl label="Vacante" controlId="filtro-vacante-ec">
            <select
              id="filtro-vacante-ec"
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
          <ReportesFilterControl label="Etapa" controlId="filtro-etapa-ec">
            <select
              id="filtro-etapa-ec"
              className={controlClass}
              value={draftStageId}
              onChange={(e) => setDraftStageId(e.target.value)}
              disabled={!draftClientId.trim() || stagesLoading}
              aria-busy={stagesLoading}
            >
              <option value="">
                {!draftClientId.trim()
                  ? "Elegí un cliente"
                  : stagesLoading
                    ? "Cargando…"
                    : "Todas"}
              </option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </ReportesFilterControl>
          <ReportesFilterControl label="Desde" controlId="filtro-desde-ec">
            <input
              id="filtro-desde-ec"
              type="date"
              className={controlClass}
              value={draftDateFrom}
              onChange={(e) => setDraftDateFrom(e.target.value)}
            />
          </ReportesFilterControl>
          <ReportesFilterControl label="Hasta" controlId="filtro-hasta-ec">
            <input
              id="filtro-hasta-ec"
              type="date"
              className={controlClass}
              value={draftDateTo}
              onChange={(e) => setDraftDateTo(e.target.value)}
            />
          </ReportesFilterControl>
        </ReportesFiltersPlaceholder>
        <p className="font-sans text-xs text-muted-foreground">
          Las etapas del filtro se cargan según el cliente seleccionado (compañía).
        </p>
        <ReportesQueryActions
          statusText={statusLine}
          loading={loading}
          onApply={handleApplyFilters}
          extra={
            <ReportesExportToolbar
              reportSlug="estatus-candidatos-por-etapa"
              disabled={loading || !!error}
              matrix={csvMatrix}
            />
          }
        />
        {!loading && !error ? (
          <ReportesKpiStrip
            headingId="reporte-ec-kpis"
            title="Indicadores"
            items={[...kpiItems]}
            columnsClassName="sm:grid-cols-2 lg:grid-cols-4"
          />
        ) : null}
        {!loading && !error && funnelChartRows.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ReportesChartCard
              title="Embudo por etapa (barras)"
              description={funnelDescription}
              headingId="reporte-ec-funnel"
              minHeightClassName="min-h-[280px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={funnelChartRows}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const payload = item?.payload as
                        | { stagePercent?: number }
                        | undefined
                      const pct = payload?.stagePercent
                      const suffix =
                        pct != null && !Number.isNaN(pct)
                          ? ` · ${pct.toFixed(1)}% del total`
                          : ""
                      return [`${value} candidatos${suffix}`, "Candidatos"]
                    }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" name="Candidatos" fill={FUNNEL_COLOR} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ReportesChartCard>
            <ReportesChartCard
              title="Distribución por etapa"
              description="Proporción de candidatos en las etapas mostradas arriba."
              headingId="reporte-ec-pie"
              minHeightClassName="min-h-[280px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${String(name).slice(0, 14)}${String(name).length > 14 ? "…" : ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.fill ?? PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </ReportesChartCard>
          </div>
        ) : null}
        {!loading && !error ? (
          <ReportesAlertsPanel headingId="reporte-ec-alertas" alerts={alerts} />
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
        <ReportesDataTable<CandidateStatusByStageRow>
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          tableAriaLabel="Tabla del reporte estatus candidatos por etapa"
          getRowKey={(r, i) =>
            String(
              r.candidateProfileId ??
                `${r.vacancyId}-${i}-${r.candidateName}`
            )
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
