"use client"

import Link from "next/link"
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
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  PieChart as PieChartIcon,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import ReportesFiltersPlaceholder, {
  ReportesFilterControl,
} from "@/components/rrhh/reportes/reportes-filters-placeholder"
import { ReportesChartCard } from "@/components/rrhh/reportes/reportes-chart-card"
import { ReportesExportToolbar } from "@/components/rrhh/reportes/reportes-export-toolbar"
import { ReportesQueryActions } from "@/components/rrhh/reportes/reportes-query-actions"
import ReportesEmptyState from "@/components/rrhh/reportes/reportes-empty-state"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  fetchPreliminaryMatchScores,
  listRecruiterCompanies,
  listRecruiterStages,
  listRecruiterVacancies,
  type PreliminaryMatchScoreRow,
  type RecruiterCompanyOption,
  type RecruiterStageOption,
  type RecruiterVacancyOption,
} from "@/lib/api/recruiter-reports"
import { formatReportDate } from "@/lib/reportes-display"
import { displayCompanyOrClientLabel } from "@/lib/reportes-metrics"
import { preliminaryMatchScoreValue } from "@/lib/reportes-metrics"
import {
  bestScoringRow,
  calculateAverageScore,
  candidateDisplayName,
  candidateEmailDisplay,
  countMatchLevelEquals,
  formatDateTime,
  getInitials,
  getMatchLevelTone,
  getScoreTone,
  getStatusTone,
  groupByMatchLevel,
  groupByVacancyAverage,
  latestAnalysisFormatted,
  normalizeMatchLevel,
  rowAnalysisIso,
  stageDisplayLabel,
  type NormalizedMatchLevel,
} from "@/lib/reportes-preliminary-match-helpers"

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

const PAGE_SIZE = 25

const SORT_BY_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "analyzedAt", label: "Fecha análisis" },
  { value: "vacancyTitle", label: "Vacante" },
  { value: "candidateName", label: "Candidato" },
] as const

const MATCH_LEVEL_CHART_LABEL: Record<NormalizedMatchLevel, string> = {
  High: "Alto",
  Medium: "Medio",
  Low: "Bajo",
  Unknown: "Sin clasificar",
}

const MATCH_LEVEL_CHART_COLOR: Record<NormalizedMatchLevel, string> = {
  High: "#10b981",
  Medium: "#f59e0b",
  Low: "#ef4444",
  Unknown: "#a1a1aa",
}

function scoreBarFill(score: number | null): string {
  if (score == null || Number.isNaN(score)) return "#a3a3a3"
  if (score >= 80) return "#10b981"
  if (score >= 50) return "#f59e0b"
  return "#ef4444"
}

function levelLabel(r: PreliminaryMatchScoreRow): string {
  return (r.matchLevel ?? r.level ?? "—").trim() || "—"
}

function statusLabel(r: PreliminaryMatchScoreRow): string {
  return (r.analysisStatus ?? r.status ?? "—").trim() || "—"
}

function truncateLabel(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function ScoreRing({ score }: { score: number }) {
  const r = 20
  const c = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, score))
  const dash = c - (pct / 100) * c
  const stroke = scoreBarFill(score)
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      className="shrink-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        className="stroke-zinc-200"
        strokeWidth="5"
      />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={dash}
      />
    </svg>
  )
}

export default function ReportePreliminaryMatchScoresPage() {
  const trail = [
    { label: "Reportes", href: "/portal-rrhh/reportes" },
    { label: "Scores matching preliminar" },
  ]

  const [companies, setCompanies] = useState<RecruiterCompanyOption[]>([])
  const [vacancies, setVacancies] = useState<RecruiterVacancyOption[]>([])
  const [stages, setStages] = useState<RecruiterStageOption[]>([])
  const [stagesLoading, setStagesLoading] = useState(false)

  const [draftClientId, setDraftClientId] = useState("")
  const [draftVacancyId, setDraftVacancyId] = useState("")
  const [draftCandidateId, setDraftCandidateId] = useState("")
  const [draftStageId, setDraftStageId] = useState("")
  const [draftScoreMin, setDraftScoreMin] = useState("")
  const [draftScoreMax, setDraftScoreMax] = useState("")
  const [draftDateFrom, setDraftDateFrom] = useState("")
  const [draftDateTo, setDraftDateTo] = useState("")
  const [draftSortBy, setDraftSortBy] = useState("score")
  const [draftSortDirection, setDraftSortDirection] = useState<"asc" | "desc">("desc")

  const [appliedClientId, setAppliedClientId] = useState("")
  const [appliedVacancyId, setAppliedVacancyId] = useState("")
  const [appliedCandidateId, setAppliedCandidateId] = useState("")
  const [appliedStageId, setAppliedStageId] = useState("")
  const [appliedScoreMin, setAppliedScoreMin] = useState("")
  const [appliedScoreMax, setAppliedScoreMax] = useState("")
  const [appliedDateFrom, setAppliedDateFrom] = useState("")
  const [appliedDateTo, setAppliedDateTo] = useState("")
  const [appliedSortBy, setAppliedSortBy] = useState("score")
  const [appliedSortDirection, setAppliedSortDirection] = useState<"asc" | "desc">("desc")

  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<PreliminaryMatchScoreRow[]>([])
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
    void run()
    return () => {
      cancelled = true
    }
  }, [draftClientId])

  const parseOptionalInt = (s: string): number | undefined => {
    const t = s.trim()
    if (t === "") return undefined
    const n = Number.parseInt(t, 10)
    if (Number.isNaN(n)) return undefined
    return n
  }

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPreliminaryMatchScores({
        clientId: appliedClientId || undefined,
        vacancyId: appliedVacancyId || undefined,
        candidateId: appliedCandidateId.trim() || undefined,
        stageId: appliedStageId || undefined,
        scoreMin: parseOptionalInt(appliedScoreMin),
        scoreMax: parseOptionalInt(appliedScoreMax),
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
    appliedVacancyId,
    appliedCandidateId,
    appliedStageId,
    appliedScoreMin,
    appliedScoreMax,
    appliedDateFrom,
    appliedDateTo,
    appliedSortBy,
    appliedSortDirection,
    page,
  ])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleApplyFilters = () => {
    setAppliedClientId(draftClientId)
    setAppliedVacancyId(draftVacancyId)
    setAppliedCandidateId(draftCandidateId)
    setAppliedStageId(draftStageId)
    setAppliedScoreMin(draftScoreMin)
    setAppliedScoreMax(draftScoreMax)
    setAppliedDateFrom(draftDateFrom)
    setAppliedDateTo(draftDateTo)
    setAppliedSortBy(draftSortBy)
    setAppliedSortDirection(draftSortDirection)
    setPage(1)
  }

  const handleClearFilters = () => {
    setDraftClientId("")
    setDraftVacancyId("")
    setDraftCandidateId("")
    setDraftStageId("")
    setDraftScoreMin("")
    setDraftScoreMax("")
    setDraftDateFrom("")
    setDraftDateTo("")
    setDraftSortBy("score")
    setDraftSortDirection("desc")
    setAppliedClientId("")
    setAppliedVacancyId("")
    setAppliedCandidateId("")
    setAppliedStageId("")
    setAppliedScoreMin("")
    setAppliedScoreMax("")
    setAppliedDateFrom("")
    setAppliedDateTo("")
    setAppliedSortBy("score")
    setAppliedSortDirection("desc")
    setPage(1)
  }

  const hasAppliedFilters =
    appliedClientId.trim() !== "" ||
    appliedVacancyId.trim() !== "" ||
    appliedCandidateId.trim() !== "" ||
    appliedStageId.trim() !== "" ||
    appliedScoreMin.trim() !== "" ||
    appliedScoreMax.trim() !== "" ||
    appliedDateFrom.trim() !== "" ||
    appliedDateTo.trim() !== ""

  const clientLabel = (r: PreliminaryMatchScoreRow) =>
    displayCompanyOrClientLabel(r.clientName, r.companyName)

  const avgOnPage = useMemo(() => calculateAverageScore(rows), [rows])
  const bestRow = useMemo(() => bestScoringRow(rows), [rows])
  const lastFmt = useMemo(() => latestAnalysisFormatted(rows), [rows])
  const matchHighCount = useMemo(() => countMatchLevelEquals(rows, "High"), [rows])
  const matchLowCount = useMemo(() => countMatchLevelEquals(rows, "Low"), [rows])
  const pieLevels = useMemo(() => groupByMatchLevel(rows), [rows])
  const vacancyAvg = useMemo(() => groupByVacancyAverage(rows), [rows])

  const pieData = useMemo(() => {
    const keys: NormalizedMatchLevel[] = ["High", "Medium", "Low", "Unknown"]
    const total = rows.length
    return keys
      .map((key) => {
        const value = pieLevels[key]
        const pct = total > 0 ? (value / total) * 100 : 0
        return {
          key,
          name: MATCH_LEVEL_CHART_LABEL[key],
          value,
          pct,
          fill: MATCH_LEVEL_CHART_COLOR[key],
        }
      })
      .filter((d) => d.value > 0)
  }, [pieLevels, rows.length])

  const candidateBarSorted = useMemo(() => {
    const list = [...rows]
      .map((r, i) => {
        const score = preliminaryMatchScoreValue(r)
        const name = candidateDisplayName(r)
        const vac = (r.vacancyTitle ?? "").trim() || "—"
        return {
          uid: `${r.candidateId ?? r.candidateProfileId ?? "c"}-${r.vacancyId ?? "v"}-${i}`,
          shortLabel: truncateLabel(`${name} · ${vac}`, 44),
          fullName: name,
          vacancyTitle: vac,
          score: score ?? 0,
          hasScore: score != null,
          fill: scoreBarFill(score),
        }
      })
      .filter((d) => d.hasScore)
      .sort((a, b) => b.score - a.score)
    return list
  }, [rows])

  const vacancyBarData = useMemo(
    () =>
      vacancyAvg.map((v) => ({
        name: truncateLabel(v.vacancyTitle, 36),
        fullTitle: v.vacancyTitle,
        promedio: Math.round(v.averageScore * 10) / 10,
        n: v.count,
      })),
    [vacancyAvg]
  )

  const topThreeRows = useMemo(() => {
    return [...rows]
      .map((r) => ({ r, s: preliminaryMatchScoreValue(r) }))
      .filter((x): x is { r: PreliminaryMatchScoreRow; s: number } => x.s != null)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map((x) => x.r)
  }, [rows])

  const csvMatrix = useMemo(() => {
    const header = [
      "Candidato",
      "Email",
      "Vacante",
      "Cliente",
      "Score",
      "Nivel",
      "Estado",
      "Etapa",
      "Fecha análisis",
    ]
    const body = rows.map((r) => [
      candidateDisplayName(r),
      candidateEmailDisplay(r) ?? "",
      r.vacancyTitle ?? "",
      clientLabel(r),
      (() => {
        const v = preliminaryMatchScoreValue(r)
        return v == null ? "" : String(v)
      })(),
      levelLabel(r),
      statusLabel(r),
      stageDisplayLabel(r),
      formatReportDate(rowAnalysisIso(r)),
    ])
    return [header, ...body]
  }, [rows])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, totalCount)

  const statusLine =
    !loading && !error && totalCount > 0
      ? `Mostrando ${showingFrom}–${showingTo} de ${totalCount}`
      : !loading && !error
        ? `${totalCount} ${totalCount === 1 ? "registro" : "registros"}`
        : ""

  const chartBlockHeight = Math.min(
    420,
    Math.max(240, candidateBarSorted.length * 40 + 80)
  )

  const exportDisabled = loading || !!error

  return (
    <RrhhReportsShell breadcrumbLabel="Reportes" breadcrumbTrail={trail}>
      <div className="min-w-0 flex flex-col gap-8 pb-12">
        <section className="px-4 pt-6 md:px-8" aria-label="Encabezado del reporte">
          <PortalPageHeader
            title="Scores matching preliminar"
            description="Resumen visual del nivel de compatibilidad entre candidatos y vacantes."
            actions={
              <div className="flex flex-wrap items-center gap-3" data-report-pdf-exclude>
                <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-sans text-xs font-semibold text-violet-900">
                  {loading ? "…" : `${totalCount} análisis`}
                </span>
                <ReportesExportToolbar
                  reportSlug="preliminary-match-scores"
                  disabled={exportDisabled}
                  matrix={csvMatrix}
                />
              </div>
            }
          />
        </section>

        <section
          className="grid gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:px-8"
          aria-label="Indicadores del reporte"
        >
          <article className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <Users className="h-5 w-5 text-vo-purple" aria-hidden />
              <Activity className="h-4 w-4 text-muted-foreground/60" aria-hidden />
            </div>
            <p className="mt-3 font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total de análisis
            </p>
            <p className="mt-1 font-sans text-3xl font-bold tabular-nums text-foreground">
              {loading ? "—" : totalCount}
            </p>
            <p className="mt-1 font-sans text-[11px] text-muted-foreground">
              Coincide con el total del API
            </p>
          </article>
          <article className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <BarChart3 className="h-5 w-5 text-amber-600" aria-hidden />
              <Sparkles className="h-4 w-4 text-muted-foreground/60" aria-hidden />
            </div>
            <p className="mt-3 font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Score promedio
            </p>
            <p className="mt-1 font-sans text-3xl font-bold tabular-nums text-foreground">
              {loading ? "—" : avgOnPage == null ? "—" : `${avgOnPage.toFixed(1)}%`}
            </p>
            <p className="mt-1 font-sans text-[11px] text-muted-foreground">
              {totalCount > rows.length
                ? "Sobre filas de esta página"
                : "Sobre resultados visibles"}
            </p>
          </article>
          <article className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <Trophy className="h-5 w-5 text-emerald-600" aria-hidden />
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/60" aria-hidden />
            </div>
            <p className="mt-3 font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Mejor candidato
            </p>
            <p className="mt-1 line-clamp-2 font-sans text-lg font-bold leading-snug text-foreground">
              {loading
                ? "—"
                : bestRow
                  ? candidateDisplayName(bestRow)
                  : "Sin datos"}
            </p>
            {bestRow && preliminaryMatchScoreValue(bestRow) != null ? (
              <p className="mt-1 font-sans text-sm font-semibold text-emerald-700">
                {preliminaryMatchScoreValue(bestRow)!.toFixed(1)}% ·{" "}
                {truncateLabel(bestRow.vacancyTitle ?? "—", 32)}
              </p>
            ) : (
              <p className="mt-1 font-sans text-[11px] text-muted-foreground">
                Mayor score en esta página
              </p>
            )}
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-xs font-bold text-emerald-800">High</span>
              <ArrowUpRight className="h-4 w-4 text-emerald-600/80" aria-hidden />
            </div>
            <p className="mt-3 font-sans text-xs font-medium uppercase tracking-wide text-emerald-800/80">
              Match alto
            </p>
            <p className="mt-1 font-sans text-3xl font-bold tabular-nums text-emerald-900">
              {loading ? "—" : matchHighCount}
            </p>
            <p className="mt-1 font-sans text-[11px] text-emerald-800/70">
              En esta página
            </p>
          </article>
          <article className="rounded-2xl border border-red-100 bg-red-50/40 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-sans text-xs font-bold text-red-800">Low</span>
              <ArrowDownRight className="h-4 w-4 text-red-600/80" aria-hidden />
            </div>
            <p className="mt-3 font-sans text-xs font-medium uppercase tracking-wide text-red-800/80">
              Match bajo
            </p>
            <p className="mt-1 font-sans text-3xl font-bold tabular-nums text-red-900">
              {loading ? "—" : matchLowCount}
            </p>
            <p className="mt-1 font-sans text-[11px] text-red-800/70">
              En esta página
            </p>
          </article>
          <article className="rounded-2xl border border-violet-100 bg-violet-50/35 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <CalendarClock className="h-5 w-5 text-violet-700" aria-hidden />
              <PieChartIcon className="h-4 w-4 text-muted-foreground/60" aria-hidden />
            </div>
            <p className="mt-3 font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Último análisis
            </p>
            {loading || lastFmt == null ? (
              <p className="mt-1 font-sans text-xl font-bold text-foreground">—</p>
            ) : (
              <>
                <p className="mt-1 font-sans text-lg font-bold text-foreground">
                  {lastFmt.dateLine}
                </p>
                <p className="font-sans text-xs text-muted-foreground">{lastFmt.timeLine}</p>
              </>
            )}
            <p className="mt-1 font-sans text-[11px] text-muted-foreground">
              Fecha más reciente en página
            </p>
          </article>
        </section>

        <section className="space-y-4 px-4 md:px-8" aria-label="Filtros del reporte" data-report-pdf-exclude>
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="border-b border-border bg-gradient-to-r from-violet-50/90 to-background px-5 py-4">
              <h2 className="font-sans text-sm font-semibold text-foreground">
                Filtros avanzados
              </h2>
              <p className="mt-0.5 max-w-3xl font-sans text-xs text-muted-foreground">
                Los valores se envían como query params al API de reportes. Aplicá para
                refrescar el dashboard y la tabla.
              </p>
            </div>
            <div className="p-4 md:p-6">
              <ReportesFiltersPlaceholder
                legendLabel="Parámetros"
                surfaceClassName="rounded-xl border border-border/60 bg-muted/5 p-4 md:p-5"
                controlsClassName="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <ReportesFilterControl label="Cliente" controlId="filtro-cliente-pm">
                  <select
                    id="filtro-cliente-pm"
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
                <ReportesFilterControl label="Vacante" controlId="filtro-vacante-pm">
                  <select
                    id="filtro-vacante-pm"
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
                <ReportesFilterControl label="Candidato (UUID)" controlId="filtro-candidato-pm">
                  <input
                    id="filtro-candidato-pm"
                    type="text"
                    className={controlClass}
                    value={draftCandidateId}
                    onChange={(e) => setDraftCandidateId(e.target.value)}
                    placeholder="Opcional"
                    autoComplete="off"
                  />
                </ReportesFilterControl>
                <ReportesFilterControl label="Etapa" controlId="filtro-etapa-pm">
                  <select
                    id="filtro-etapa-pm"
                    className={controlClass}
                    value={draftStageId}
                    onChange={(e) => setDraftStageId(e.target.value)}
                    disabled={!draftClientId.trim() || stagesLoading}
                  >
                    <option value="">
                      {!draftClientId.trim()
                        ? "Elegí cliente"
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
                <ReportesFilterControl label="Score mín" controlId="filtro-min-pm">
                  <input
                    id="filtro-min-pm"
                    type="number"
                    min={0}
                    max={100}
                    className={controlClass}
                    value={draftScoreMin}
                    onChange={(e) => setDraftScoreMin(e.target.value)}
                    placeholder="0–100"
                  />
                </ReportesFilterControl>
                <ReportesFilterControl label="Score máx" controlId="filtro-max-pm">
                  <input
                    id="filtro-max-pm"
                    type="number"
                    min={0}
                    max={100}
                    className={controlClass}
                    value={draftScoreMax}
                    onChange={(e) => setDraftScoreMax(e.target.value)}
                    placeholder="0–100"
                  />
                </ReportesFilterControl>
                <ReportesFilterControl label="Desde" controlId="filtro-desde-pm">
                  <input
                    id="filtro-desde-pm"
                    type="date"
                    className={controlClass}
                    value={draftDateFrom}
                    onChange={(e) => setDraftDateFrom(e.target.value)}
                  />
                </ReportesFilterControl>
                <ReportesFilterControl label="Hasta" controlId="filtro-hasta-pm">
                  <input
                    id="filtro-hasta-pm"
                    type="date"
                    className={controlClass}
                    value={draftDateTo}
                    onChange={(e) => setDraftDateTo(e.target.value)}
                  />
                </ReportesFilterControl>
                <ReportesFilterControl label="Ordenar por" controlId="filtro-sort-pm">
                  <select
                    id="filtro-sort-pm"
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
                <ReportesFilterControl label="Dirección" controlId="filtro-dir-pm">
                  <select
                    id="filtro-dir-pm"
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
              </ReportesFiltersPlaceholder>
              <div className="mt-5 border-t border-border pt-4">
                <ReportesQueryActions
                  statusText={statusLine}
                  loading={loading}
                  onApply={handleApplyFilters}
                  onClear={handleClearFilters}
                  clearDisabled={!hasAppliedFilters && page === 1}
                />
              </div>
            </div>
          </div>
        </section>

        {!loading && !error && rows.length > 0 ? (
          <section
            className="grid gap-4 px-4 lg:grid-cols-2 md:px-8"
            aria-label="Gráficos del reporte"
          >
            <ReportesChartCard
              title="Distribución por nivel de match"
              description="Cantidad y proporción según filas de esta página."
              headingId="pm-chart-match"
            >
              {pieData.length === 0 ? (
                <p className="flex h-full min-h-[200px] items-center justify-center font-sans text-sm text-muted-foreground">
                  Sin niveles clasificados en esta página.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={96}
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`${entry.key}-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, props) => {
                        const n = Number(
                          Array.isArray(value) ? value[0] : value
                        )
                        const p = (
                          props as { payload?: { pct?: number } }
                        ).payload
                        const pct = p?.pct != null ? `${p.pct.toFixed(1)}%` : ""
                        return [`${n} (${pct})`, "Cantidad"]
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ReportesChartCard>
            <ReportesChartCard
              title="Promedio de score por vacante"
              description="Promedio de preliminary match sobre candidatos en esta página."
              headingId="pm-chart-vacancy"
            >
              {vacancyBarData.length === 0 ? (
                <p className="flex h-full min-h-[200px] items-center justify-center font-sans text-sm text-muted-foreground">
                  Sin scores numéricos agrupables.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={vacancyBarData}
                    margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={70} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => {
                        const n = Number(
                          Array.isArray(value) ? value[0] : value
                        )
                        return [`${n}`, "Promedio"]
                      }}
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as { fullTitle?: string; n?: number } | undefined
                        const n = p?.n != null ? ` · ${p.n} candidato(s)` : ""
                        return `${p?.fullTitle ?? ""}${n}`
                      }}
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="promedio" name="Promedio" fill="#6E3385" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ReportesChartCard>
            <div className="lg:col-span-2">
              <ReportesChartCard
                title="Scores por candidato (página actual)"
                description="Ordenado de mayor a menor. Color según rango de score."
                headingId="pm-chart-candidates"
                minHeightClassName="!min-h-0"
              >
                {candidateBarSorted.length === 0 ? (
                  <p className="flex h-full min-h-[200px] items-center justify-center font-sans text-sm text-muted-foreground">
                    Sin scores para graficar.
                  </p>
                ) : (
                  <div style={{ height: chartBlockHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={candidateBarSorted}
                        layout="vertical"
                        margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="shortLabel"
                          width={200}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          formatter={(value) => {
                            const n = Number(
                              Array.isArray(value) ? value[0] : value
                            )
                            return [`${n}`, "Score"]
                          }}
                          labelFormatter={(_, payload) => {
                            const p = payload?.[0]?.payload as {
                              fullName?: string
                              vacancyTitle?: string
                            }
                            return `${p?.fullName ?? ""} — ${p?.vacancyTitle ?? ""}`
                          }}
                          contentStyle={{
                            borderRadius: "10px",
                            border: "1px solid #e5e7eb",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="score" name="Score" radius={[0, 6, 6, 0]}>
                          {candidateBarSorted.map((entry) => (
                            <Cell key={entry.uid} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ReportesChartCard>
            </div>
          </section>
        ) : null}

        {!loading && !error && topThreeRows.length > 0 ? (
          <section className="px-4 md:px-8" aria-label="Top candidatos">
            <h2 className="mb-3 font-sans text-base font-semibold text-foreground">
              Top candidatos
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {topThreeRows.map((r, idx) => {
                const sc = preliminaryMatchScoreValue(r) ?? 0
                const lvl = normalizeMatchLevel(r)
                const tone = getMatchLevelTone(lvl)
                return (
                  <article
                    key={`${r.candidateId ?? r.candidateProfileId}-${r.vacancyId}-${idx}`}
                    className="flex gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
                  >
                    <ScoreRing score={sc} />
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-sm font-semibold text-foreground line-clamp-2">
                        {candidateDisplayName(r)}
                      </p>
                      <p className="mt-0.5 line-clamp-1 font-sans text-xs text-muted-foreground">
                        {r.vacancyTitle ?? "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="font-sans text-lg font-bold tabular-nums text-foreground">
                          {sc.toFixed(1)}%
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 font-sans text-[10px] font-semibold uppercase ${tone.badgeClass}`}
                        >
                          {tone.label}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-1 font-sans text-[11px] text-muted-foreground">
                        {stageDisplayLabel(r)}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className="space-y-4 px-4 md:px-8" aria-label="Tabla de resultados">
          {error ? (
            <div
              className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-10 text-center"
              role="alert"
            >
              <p className="font-sans text-sm text-destructive">{error}</p>
              <button
                type="button"
                onClick={() => void loadReport()}
                className="inline-flex items-center justify-center rounded-md bg-vo-purple px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              >
                Reintentar
              </button>
            </div>
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

          {loading ? (
            <div
              className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"
              role="status"
              aria-live="polite"
            >
              <table className="w-full min-w-[960px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Candidato", "Vacante", "Score", "Nivel", "Estado", "Etapa", "Análisis", "Acciones"].map(
                      (h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-4 py-3 text-left font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-4" colSpan={8}>
                        <div className="flex animate-pulse gap-3">
                          <div className="h-11 w-11 shrink-0 rounded-full bg-muted" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-1/3 rounded bg-muted" />
                            <div className="h-3 w-1/2 rounded bg-muted/80" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : error ? null : rows.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-16 shadow-sm">
              <ReportesEmptyState
                showBackLink={false}
                description="No hay filas para los filtros seleccionados. Probá ampliar fechas o relajar criterios."
              />
            </div>
          ) : (
            <div
              className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"
              data-report-pdf-hide-last-col
            >
              <table
                className="w-full min-w-[960px] border-collapse text-left"
                aria-label="Tabla scores matching preliminar"
              >
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th
                      scope="col"
                      className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Candidato
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Vacante
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Score
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Nivel
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Estado
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Etapa
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Fecha análisis
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, rowIndex) => {
                    const score = preliminaryMatchScoreValue(r)
                    const tone = getScoreTone(score)
                    const lvlKey = normalizeMatchLevel(r)
                    const lvlTone = getMatchLevelTone(lvlKey)
                    const stTone = getStatusTone(statusLabel(r))
                    const dt = formatDateTime(rowAnalysisIso(r))
                    const profileId = r.candidateId ?? r.candidateProfileId
                    const email = candidateEmailDisplay(r)
                    return (
                      <tr
                        key={`${r.candidateId ?? r.candidateProfileId}-${r.vacancyId}-${rowAnalysisIso(r) ?? rowIndex}`}
                        className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-start gap-3">
                            <span
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-vo-purple/15 font-sans text-xs font-bold text-vo-purple"
                              aria-hidden
                            >
                              {getInitials(candidateDisplayName(r))}
                            </span>
                            <div className="min-w-0">
                              <p className="font-sans text-sm font-semibold text-foreground line-clamp-2">
                                {candidateDisplayName(r)}
                              </p>
                              {email ? (
                                <p className="mt-0.5 line-clamp-1 font-sans text-xs text-muted-foreground">
                                  {email}
                                </p>
                              ) : (
                                <p className="mt-0.5 font-sans text-xs text-muted-foreground/70">
                                  Sin email
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <p className="font-sans text-sm font-medium text-foreground line-clamp-2">
                            {r.vacancyTitle ?? "—"}
                          </p>
                          <p className="mt-0.5 line-clamp-1 font-sans text-xs text-muted-foreground">
                            {clientLabel(r)}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          {score == null ? (
                            <span className="font-sans text-sm text-muted-foreground">—</span>
                          ) : (
                            <div className="inline-flex min-w-[140px] flex-col items-end gap-1">
                              <span
                                className={`font-sans text-lg font-bold tabular-nums ${tone.textClass}`}
                              >
                                {score.toFixed(1)}%
                              </span>
                              <div className={`h-2 w-full max-w-[140px] overflow-hidden rounded-full ${tone.trackClass}`}>
                                <div
                                  className={`h-full rounded-full ${tone.barClass}`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 font-sans text-xs font-semibold ${lvlTone.badgeClass}`}
                          >
                            {lvlTone.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 font-sans text-xs font-semibold ${stTone.badgeClass}`}
                          >
                            {stTone.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-flex max-w-[160px] rounded-full border border-border bg-muted/40 px-2.5 py-1 font-sans text-xs font-medium text-foreground line-clamp-2">
                            {stageDisplayLabel(r)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {dt ? (
                            <>
                              <p className="font-sans text-sm text-foreground">{dt.dateLine}</p>
                              <p className="font-sans text-xs text-muted-foreground">{dt.timeLine}</p>
                            </>
                          ) : (
                            <span className="font-sans text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          {profileId ? (
                            <Link
                              href={`/portal-rrhh/candidatos/${encodeURIComponent(String(profileId))}`}
                              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                            >
                              Ver detalle
                            </Link>
                          ) : (
                            <span className="font-sans text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </RrhhReportsShell>
  )
}
