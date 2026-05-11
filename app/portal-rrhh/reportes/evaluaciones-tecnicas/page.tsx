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
  fetchTechnicalEvaluations,
  listRecruiterVacancies,
  type RecruiterVacancyOption,
  type TechnicalEvaluationRow,
} from "@/lib/api/recruiter-reports"
import { formatReportDate } from "@/lib/reportes-display"
import { displayCompanyOrClientLabel } from "@/lib/public-company-display"
import {
  computeTechnicalEvaluationKpis,
  parseTechnicalScorePercent,
  technicalEvaluationBucket,
} from "@/lib/reportes-metrics"

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

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

  const [vacancies, setVacancies] = useState<RecruiterVacancyOption[]>([])

  const [draftVacancyId, setDraftVacancyId] = useState("")
  const [draftOutcome, setDraftOutcome] = useState("")
  const [draftDateFrom, setDraftDateFrom] = useState("")
  const [draftDateTo, setDraftDateTo] = useState("")

  const [appliedVacancyId, setAppliedVacancyId] = useState("")
  const [appliedOutcome, setAppliedOutcome] = useState("")
  const [appliedDateFrom, setAppliedDateFrom] = useState("")
  const [appliedDateTo, setAppliedDateTo] = useState("")

  const [rows, setRows] = useState<TechnicalEvaluationRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadVacancies = useCallback(async () => {
    try {
      const list = await listRecruiterVacancies()
      setVacancies(list)
    } catch {
      setVacancies([])
    }
  }, [])

  useEffect(() => {
    loadVacancies()
  }, [loadVacancies])

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchTechnicalEvaluations({
        vacancyId: appliedVacancyId || undefined,
        outcome: appliedOutcome.trim() || undefined,
        dateFrom: appliedDateFrom || undefined,
        dateTo: appliedDateTo || undefined,
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
  }, [appliedVacancyId, appliedOutcome, appliedDateFrom, appliedDateTo])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleApplyFilters = () => {
    setAppliedVacancyId(draftVacancyId)
    setAppliedOutcome(draftOutcome)
    setAppliedDateFrom(draftDateFrom)
    setAppliedDateTo(draftDateTo)
  }

  const kpis = useMemo(() => computeTechnicalEvaluationKpis(rows), [rows])

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
    { label: "Evaluaciones", value: loading ? "—" : kpis.total },
    { label: "Aprobadas", value: loading ? "—" : kpis.approved },
    { label: "En revisión", value: loading ? "—" : kpis.review },
    { label: "Reprobadas", value: loading ? "—" : kpis.failed },
    { label: "Pendientes", value: loading ? "—" : kpis.pending },
    {
      label: "Puntaje medio",
      value:
        loading || kpis.avgScore == null
          ? "—"
          : `${kpis.avgScore.toFixed(1)}%`,
      helper:
        kpis.withNumericScore > 0
          ? `${kpis.withNumericScore} con puntaje parseado`
          : undefined,
    },
  ] as const

  const statusLine =
    !loading && !error
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
          <ReportesFilterControl label="Resultado (contiene)" controlId="filtro-resultado-ev">
            <input
              id="filtro-resultado-ev"
              type="text"
              placeholder="Texto en estado / resultado"
              className={controlClass}
              value={draftOutcome}
              onChange={(e) => setDraftOutcome(e.target.value)}
              autoComplete="off"
            />
          </ReportesFilterControl>
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
        <p className="font-sans text-xs text-muted-foreground">
          El filtro de resultado se envía como{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">outcome</code> al API. Los KPIs
          de estado usan heurística sobre texto si el backend no normaliza enums.
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
            columnsClassName="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          />
        ) : null}
        {!loading && !error && distributionPie.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <ReportesChartCard
              title="Distribución de resultados"
              description="Aprobados, revisión, reprobados y pendientes (heurística)."
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
