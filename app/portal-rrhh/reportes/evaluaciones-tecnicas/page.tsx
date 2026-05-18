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
  fetchReportsFilters,
  fetchTechnicalEvaluations,
  listRecruiterCompanies,
  listRecruiterVacancies,
  type RecruiterCompanyOption,
  type RecruiterVacancyOption,
  type TechnicalEvaluationRow,
} from "@/lib/api/recruiter-reports"
import { formatReportDate } from "@/lib/reportes-display"
import { displayCompanyOrClientLabel } from "@/lib/reportes-metrics"
import {
  computeTechnicalEvaluationKpis,
  parseTechnicalScorePercent,
  technicalEvaluationBucket,
} from "@/lib/reportes-metrics"

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

const PAGE_SIZE = 20

const DIST_COLORS = {
  approved: "#059669",
  review: "#CA8A04",
  failed: "#DC2626",
  pending: "#64748B",
}

const PIE_ORDER: ("approved" | "review" | "failed" | "pending")[] = [
  "approved",
  "review",
  "failed",
  "pending",
]

const PIE_LABELS: Record<string, string> = {
  approved: "Aprobados",
  review: "En revisión",
  failed: "Reprobados",
  pending: "Pendientes",
}

function formatSkillBreakdown(value: unknown): string {
  if (value == null) return "—"
  if (typeof value === "string") {
    const t = value.trim()
    if (t === "") return "—"
    if (t.length > 80) return `${t.slice(0, 77)}…`
    return t
  }
  try {
    const s = JSON.stringify(value)
    return s.length > 100 ? `${s.slice(0, 97)}…` : s
  } catch {
    return "—"
  }
}

export default function ReporteEvaluacionesTecnicasPage() {
  const trail = [
    { label: "Reportes", href: "/portal-rrhh/reportes" },
    { label: "Evaluaciones técnicas" },
  ]

  const [companies, setCompanies] = useState<RecruiterCompanyOption[]>([])
  const [vacancies, setVacancies] = useState<RecruiterVacancyOption[]>([])

  const [draftClientId, setDraftClientId] = useState("")
  const [draftCandidateId, setDraftCandidateId] = useState("")
  const [draftVacancyId, setDraftVacancyId] = useState("")
  const [draftOutcome, setDraftOutcome] = useState("")
  const [draftDateFrom, setDraftDateFrom] = useState("")
  const [draftDateTo, setDraftDateTo] = useState("")

  const [appliedClientId, setAppliedClientId] = useState("")
  const [appliedCandidateId, setAppliedCandidateId] = useState("")
  const [appliedVacancyId, setAppliedVacancyId] = useState("")
  const [appliedOutcome, setAppliedOutcome] = useState("")
  const [appliedDateFrom, setAppliedDateFrom] = useState("")
  const [appliedDateTo, setAppliedDateTo] = useState("")

  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<TechnicalEvaluationRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [outcomeHints, setOutcomeHints] = useState<string[]>([])

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
    let cancelled = false
    const run = async () => {
      try {
        const f = await fetchReportsFilters({
          clientId: draftClientId || undefined,
          dateFrom: draftDateFrom || undefined,
          dateTo: draftDateTo || undefined,
        })
        if (!cancelled) setOutcomeHints(f.technicalEvaluationOutcomes ?? [])
      } catch {
        if (!cancelled) setOutcomeHints([])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [draftClientId, draftDateFrom, draftDateTo])

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchTechnicalEvaluations({
        vacancyId: appliedVacancyId || undefined,
        clientId: appliedClientId || undefined,
        candidateId: appliedCandidateId.trim() || undefined,
        outcome: appliedOutcome.trim() || undefined,
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
    appliedVacancyId,
    appliedClientId,
    appliedCandidateId,
    appliedOutcome,
    appliedDateFrom,
    appliedDateTo,
    page,
  ])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleApplyFilters = () => {
    setAppliedClientId(draftClientId)
    setAppliedCandidateId(draftCandidateId)
    setAppliedVacancyId(draftVacancyId)
    setAppliedOutcome(draftOutcome)
    setAppliedDateFrom(draftDateFrom)
    setAppliedDateTo(draftDateTo)
    setPage(1)
  }

  const kpis = useMemo(
    () => computeTechnicalEvaluationKpis(rows, totalCount),
    [rows, totalCount]
  )

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, totalCount)

  const sortedByScore = useMemo(() => {
    return [...rows].sort((a, b) => {
      const sa = parseTechnicalScorePercent(a) ?? -1
      const sb = parseTechnicalScorePercent(b) ?? -1
      return sb - sa
    })
  }, [rows])

  const distributionPie = useMemo(() => {
    const counts = {
      approved: kpis.approved,
      review: kpis.review,
      failed: kpis.failed,
      pending: kpis.pending,
    }
    return PIE_ORDER.filter((k) => counts[k] > 0).map((k) => ({
      name: PIE_LABELS[k],
      key: k,
      value: counts[k],
      fill: DIST_COLORS[k],
    }))
  }, [kpis])

  const rankingChartData = useMemo(() => {
    return sortedByScore
      .map((r) => ({
        name: (r.candidateName ?? "—").slice(0, 18),
        score: parseTechnicalScorePercent(r),
      }))
      .filter((x) => x.score != null)
      .slice(0, 12) as { name: string; score: number }[]
  }, [sortedByScore])

  const alerts = useMemo((): ReportesAlertItem[] => {
    const out: ReportesAlertItem[] = []
    rows.forEach((r, i) => {
      const b = technicalEvaluationBucket(r)
      if (b === "pending") {
        out.push({
          id: `pend-${r.candidateProfileId ?? i}`,
          severity: "info",
          message: `Evaluación pendiente: ${r.candidateName ?? "—"} — ${r.evaluationTitle ?? r.testName ?? "prueba"}.`,
        })
      }
    })
    return out.slice(0, 12)
  }, [rows])

  const clientLabel = (r: TechnicalEvaluationRow) =>
    displayCompanyOrClientLabel(r.clientName, r.companyName)

  const columns = [
    {
      header: "Candidato",
      render: (r: TechnicalEvaluationRow) => r.candidateName ?? "—",
    },
    {
      header: "Vacante",
      render: (r: TechnicalEvaluationRow) => r.vacancyTitle ?? "—",
    },
    {
      header: "Cliente",
      render: (r: TechnicalEvaluationRow) => clientLabel(r),
    },
    {
      header: "Prueba",
      render: (r: TechnicalEvaluationRow) =>
        r.evaluationTitle ?? r.testName ?? "—",
    },
    {
      header: "Puntaje",
      numeric: true,
      render: (r: TechnicalEvaluationRow) => {
        const p = parseTechnicalScorePercent(r)
        return p == null ? "—" : `${p.toFixed(0)}%`
      },
    },
    {
      header: "Resultado",
      render: (r: TechnicalEvaluationRow) =>
        r.scoreOrOutcome ?? r.status ?? r.outcome ?? "—",
    },
    {
      header: "Dificultad",
      render: (r: TechnicalEvaluationRow) => r.difficultyLevel ?? "—",
    },
    {
      header: "IA",
      render: (r: TechnicalEvaluationRow) => r.aiRecommendation ?? "—",
    },
    {
      header: "Fecha envío",
      render: (r: TechnicalEvaluationRow) =>
        formatReportDate(r.sentAt),
    },
    {
      header: "Fecha finalización",
      render: (r: TechnicalEvaluationRow) =>
        formatReportDate(r.completedAt ?? r.evaluatedAt),
    },
    {
      header: "Evaluador",
      render: (r: TechnicalEvaluationRow) => r.evaluatorName ?? "—",
    },
    {
      header: "Habilidades (resumen)",
      render: (r: TechnicalEvaluationRow) =>
        formatSkillBreakdown(r.skillBreakdown),
    },
  ] as const

  const csvMatrix = useMemo(() => {
    const header = [
      "Candidato",
      "Vacante",
      "Cliente",
      "Prueba",
      "Puntaje",
      "Resultado",
      "Dificultad",
      "IA",
      "Fecha envío",
      "Fecha finalización",
      "Evaluador",
      "Habilidades (resumen)",
    ]
    const body = rows.map((r) => [
      r.candidateName ?? "",
      r.vacancyTitle ?? "",
      clientLabel(r),
      r.evaluationTitle ?? r.testName ?? "",
      (() => {
        const p = parseTechnicalScorePercent(r)
        return p == null ? "" : `${p}%`
      })(),
      r.scoreOrOutcome ?? r.status ?? r.outcome ?? "",
      r.difficultyLevel ?? "",
      r.aiRecommendation ?? "",
      formatReportDate(r.sentAt),
      formatReportDate(r.completedAt ?? r.evaluatedAt),
      r.evaluatorName ?? "",
      formatSkillBreakdown(r.skillBreakdown),
    ])
    return [header, ...body]
  }, [rows])

  const kpiItems = [
    {
      label: "Evaluaciones (total filtros)",
      value: loading ? "—" : kpis.totalUnderFilter,
      helper:
        !loading && kpis.rowsOnPage < kpis.totalUnderFilter
          ? `En esta página: ${kpis.rowsOnPage}`
          : undefined,
    },
    {
      label: "Aprobadas (pág.)",
      value: loading ? "—" : kpis.approved,
    },
    { label: "En revisión (pág.)", value: loading ? "—" : kpis.review },
    { label: "Reprobadas (pág.)", value: loading ? "—" : kpis.failed },
    { label: "Pendientes (pág.)", value: loading ? "—" : kpis.pending },
    {
      label: "Puntaje medio",
      value:
        loading || kpis.avgScore == null
          ? "—"
          : `${kpis.avgScore.toFixed(1)}%`,
      helper:
        kpis.withNumericScore > 0
          ? `${kpis.withNumericScore} con puntaje parseado (pág.)`
          : undefined,
    },
  ] as const

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
          title="Evaluaciones técnicas"
          description="Resultados, ranking por puntaje, distribución por estado y campos extendidos cuando el API los envíe."
        />
      </section>
      <section className="space-y-4 px-4 md:px-8" aria-label="Filtros y tabla del reporte">
        <ReportesFiltersPlaceholder>
          <ReportesFilterControl label="Cliente" controlId="filtro-cliente-ev">
            <select
              id="filtro-cliente-ev"
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
          <ReportesFilterControl label="Candidato (UUID)" controlId="filtro-candidato-ev">
            <input
              id="filtro-candidato-ev"
              type="text"
              placeholder="UUID opcional"
              className={controlClass}
              value={draftCandidateId}
              onChange={(e) => setDraftCandidateId(e.target.value)}
              autoComplete="off"
            />
          </ReportesFilterControl>
          <ReportesFilterControl label="Vacante" controlId="filtro-vacante-ev">
            <select
              id="filtro-vacante-ev"
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
          <>
            <ReportesFilterControl label="Resultado (contiene)" controlId="filtro-resultado-ev">
              <input
                id="filtro-resultado-ev"
                type="text"
                placeholder="Texto en estado / resultado"
                className={controlClass}
                value={draftOutcome}
                onChange={(e) => setDraftOutcome(e.target.value)}
                autoComplete="off"
                list="reportes-ev-outcome-hints"
              />
            </ReportesFilterControl>
            <datalist id="reportes-ev-outcome-hints">
              {outcomeHints.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </>
          <ReportesFilterControl label="Desde" controlId="filtro-desde-ev">
            <input
              id="filtro-desde-ev"
              type="date"
              className={controlClass}
              value={draftDateFrom}
              onChange={(e) => setDraftDateFrom(e.target.value)}
            />
          </ReportesFilterControl>
          <ReportesFilterControl label="Hasta" controlId="filtro-hasta-ev">
            <input
              id="filtro-hasta-ev"
              type="date"
              className={controlClass}
              value={draftDateTo}
              onChange={(e) => setDraftDateTo(e.target.value)}
            />
          </ReportesFilterControl>
        </ReportesFiltersPlaceholder>
        <p className="font-sans text-xs text-muted-foreground" data-report-pdf-exclude>
          El filtro de resultado se envía como{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">outcome</code>;{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">clientId</code> y{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">candidateId</code> filtran en servidor.
          Los KPIs de estado por fila son de la página actual; el total de filas viene del API.
        </p>
        <ReportesQueryActions
          statusText={statusLine}
          loading={loading}
          onApply={handleApplyFilters}
          extra={
            <ReportesExportToolbar
              reportSlug="evaluaciones-tecnicas"
              disabled={loading || !!error}
              matrix={csvMatrix}
            />
          }
        />
        {!loading && !error ? (
          <ReportesKpiStrip
            headingId="reporte-ev-kpis"
            title="Indicadores"
            items={[...kpiItems]}
            columnsClassName="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7"
          />
        ) : null}
        {!loading && !error && distributionPie.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ReportesChartCard
              title="Distribución de resultados"
              description="Aprobados, revisión, reprobados y pendientes (heurística sobre esta página)."
              headingId="reporte-ev-pie"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={false}
                  >
                    {distributionPie.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </ReportesChartCard>
            {rankingChartData.length > 0 ? (
              <ReportesChartCard
                title="Ranking por puntaje (top 12)"
                description="Solo filas con puntaje numérico reconocido en texto."
                headingId="reporte-ev-rank"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rankingChartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      width={36}
                    />
                    <Tooltip
                      formatter={(v) => [`${v}%`, "Puntaje"]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #E5E7EB",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="score" name="Puntaje %" fill="#6E3385" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportesChartCard>
            ) : (
              <p className="rounded-xl border border-border bg-muted/30 px-4 py-8 text-center font-sans text-sm text-muted-foreground">
                No hay puntajes numéricos parseables en este conjunto. Cuando el API envíe porcentaje
                estable, el ranking aparecerá aquí.
              </p>
            )}
          </div>
        ) : null}
        {!loading && !error ? (
          <ReportesAlertsPanel headingId="reporte-ev-alertas" alerts={alerts} />
        ) : null}
        <div className="flex flex-wrap items-center gap-2" data-report-pdf-exclude>
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
        <ReportesDataTable<TechnicalEvaluationRow>
          columns={columns}
          rows={sortedByScore}
          loading={loading}
          error={error}
          tableAriaLabel="Tabla del reporte evaluaciones técnicas"
          getRowKey={(r, i) =>
            String(
              `${r.candidateProfileId}-${r.vacancyId}-${r.evaluatedAt}-${i}`
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
