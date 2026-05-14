"use client"

import type { ReactNode } from "react"
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
import { displayCompanyOrClientLabel } from "@/lib/public-company-display"
import {
  defaultMonthDateRange,
  formatPercent,
  formatRecruitmentSourceLabel,
} from "@/lib/reportes-display"
import { computeRecruitmentSourcesKpis } from "@/lib/reportes-metrics"

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

export default function ReporteFuentesReclutamientoPage() {
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

  const kpis = useMemo(() => computeRecruitmentSourcesKpis(rows), [rows])

  const pieByCandidates = useMemo(
    () =>
      rows.map((r, i) => ({
        name: rowLabelForCharts(r, appliedGroupBy),
        value: r.candidatesCount ?? 0,
        fill: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [rows, appliedGroupBy]
  )

  const hiresBarData = useMemo(
    () =>
      [...rows]
        .map((r) => ({
          name: rowLabelForCharts(r, appliedGroupBy).slice(0, 18),
          fullName: rowLabelForCharts(r, appliedGroupBy),
          contrataciones: r.hiresCount ?? 0,
        }))
        .sort((a, b) => b.contrataciones - a.contrataciones),
    [rows, appliedGroupBy]
  )

  const vacancyClientCell = (r: RecruitmentSourceRow) =>
    displayCompanyOrClientLabel(r.clientName, undefined)

  type SourceColumn = {
    header: string
    render: (r: RecruitmentSourceRow) => ReactNode
    numeric?: boolean
  }

  const columns = useMemo((): readonly SourceColumn[] => {
    const base: SourceColumn[] = [
      {
        header: "Fuente",
        render: (r: RecruitmentSourceRow) => formatRecruitmentSourceLabel(r),
      },
    ]
    if (appliedGroupBy === "vacancy") {
      base.push(
        {
          header: "Vacante",
          render: (r: RecruitmentSourceRow) => r.vacancyTitle ?? "—",
        },
        {
          header: "Cliente",
          render: (r: RecruitmentSourceRow) => vacancyClientCell(r),
        }
      )
    }
    base.push(
      {
        header: "Candidatos",
        numeric: true,
        render: (r: RecruitmentSourceRow) =>
          r.candidatesCount != null ? String(r.candidatesCount) : "—",
      },
      {
        header: "Preseleccionados",
        numeric: true,
        render: (r: RecruitmentSourceRow) =>
          r.preselectedCount != null ? String(r.preselectedCount) : "—",
      },
      {
        header: "Entrevistados",
        numeric: true,
        render: (r: RecruitmentSourceRow) =>
          r.interviewedCount != null ? String(r.interviewedCount) : "—",
      },
      {
        header: "Finalistas",
        numeric: true,
        render: (r: RecruitmentSourceRow) =>
          r.finalistsCount != null ? String(r.finalistsCount) : "—",
      },
      {
        header: "Contratados",
        numeric: true,
        render: (r: RecruitmentSourceRow) =>
          r.hiresCount != null ? String(r.hiresCount) : "—",
      },
      {
        header: "Conversión",
        numeric: true,
        render: (r: RecruitmentSourceRow) =>
          formatPercent(r.conversionPercent ?? undefined),
      }
    )
    return base
  }, [appliedGroupBy])

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
        formatPercent(r.conversionPercent ?? undefined),
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

  const kpiItems = [
    {
      label: "Filas (total filtros)",
      value: loading ? "—" : totalCount,
      helper: !loading && totalCount > rows.length ? `Página: ${rows.length}` : undefined,
    },
    {
      label: "Candidatos (suma pág.)",
      value: loading ? "—" : kpis.totalCandidates,
    },
    {
      label: "Contrataciones (suma pág.)",
      value: loading ? "—" : kpis.totalHires,
    },
    {
      label: "Filas en página",
      value: loading ? "—" : kpis.sourcesCount,
    },
    {
      label: "Conversión media (pág.)",
      value:
        loading || kpis.avgConversionPercent == null
          ? "—"
          : `${kpis.avgConversionPercent.toFixed(2)}%`,
      helper: "Promedio simple del % informado por fila en esta página",
    },
  ] as const

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, totalCount)

  const statusLine =
    !loading && !error && totalCount > 0
      ? `Mostrando ${showingFrom}–${showingTo} de ${totalCount}`
      : !loading && !error
        ? `${totalCount} ${totalCount === 1 ? "fila" : "filas"}`
        : ""

  const mainContent = (
    <div className="min-w-0 flex flex-col gap-6 pb-10">
      <section className="px-4 pt-6 md:px-8" aria-label="Encabezado del reporte">
        <PortalPageHeader
          title="Fuentes de reclutamiento"
          description="Volumen por canal, contrataciones y conversión. Agrupación por fuente o por vacante; claves de fuente opcionales desde GET /reports/filters."
        />
      </section>
      <section className="space-y-4 px-4 md:px-8" aria-label="Filtros y tabla del reporte">
        <ReportesFiltersPlaceholder>
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
        <p className="font-sans text-xs text-muted-foreground">
          Las claves de fuente del desplegable se cargan con{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">GET …/reports/filters</code>{" "}
          según las fechas y el cliente seleccionados en el formulario (antes de aplicar también actualiza la lista).
        </p>
        <ReportesQueryActions
          statusText={statusLine}
          loading={loading}
          onApply={handleApplyFilters}
          extra={
            <ReportesExportToolbar
              reportSlug="fuentes-reclutamiento"
              disabled={loading || !!error}
              matrix={csvMatrix}
            />
          }
        />
        {!loading && !error ? (
          <ReportesKpiStrip
            headingId="reporte-fr-kpis"
            title="Indicadores del periodo"
            items={[...kpiItems]}
            columnsClassName="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          />
        ) : null}
        {!loading && !error && pieByCandidates.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ReportesChartCard
              title="Origen del volumen (candidatos)"
              description={
                appliedGroupBy === "vacancy"
                  ? "Participación por fila (vacante + fuente) en esta página."
                  : "Participación por fuente según candidatos en esta página."
              }
              headingId="reporte-fr-pie"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieByCandidates}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={false}
                  >
                    {pieByCandidates.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={entry.fill ?? PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </ReportesChartCard>
            <ReportesChartCard
              title="Contrataciones"
              description={
                appliedGroupBy === "vacancy"
                  ? "Cierres por vacante y fuente (página actual)."
                  : "Qué canal aporta más cierres (página actual)."
              }
              headingId="reporte-fr-hires"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={hiresBarData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(v) => [v, "Contrataciones"]}
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload as { fullName?: string } | undefined
                      return p?.fullName ?? ""
                    }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #E5E7EB",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="contrataciones" name="Contrataciones" fill="#496FB3" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ReportesChartCard>
          </div>
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
        <ReportesDataTable<RecruitmentSourceRow>
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          tableAriaLabel="Tabla del reporte fuentes de reclutamiento"
          getRowKey={(r, i) =>
            String(
              `${r.vacancyId ?? ""}-${r.sourceKey ?? r.applicationSource ?? "src"}-${i}`
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
