"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import ReportesFiltersPlaceholder, {
  ReportesFilterControl,
} from "@/components/rrhh/reportes/reportes-filters-placeholder"
import ReportesDataTable from "@/components/rrhh/reportes/reportes-data-table"
import { ReportesExportToolbar } from "@/components/rrhh/reportes/reportes-export-toolbar"
import { ReportesQueryActions } from "@/components/rrhh/reportes/reportes-query-actions"
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
import { displayCompanyOrClientLabel } from "@/lib/public-company-display"
import { preliminaryMatchScoreValue } from "@/lib/reportes-metrics"

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

const PAGE_SIZE = 25

const SORT_BY_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "analyzedAt", label: "Fecha análisis" },
  { value: "vacancyTitle", label: "Vacante" },
  { value: "candidateName", label: "Candidato" },
] as const

function levelLabel(r: PreliminaryMatchScoreRow): string {
  return (r.matchLevel ?? r.level ?? "—").trim() || "—"
}

function statusLabel(r: PreliminaryMatchScoreRow): string {
  return (r.analysisStatus ?? r.status ?? "—").trim() || "—"
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

  const clientLabel = (r: PreliminaryMatchScoreRow) =>
    displayCompanyOrClientLabel(r.clientName, r.companyName)

  const columns = [
    {
      header: "Candidato",
      render: (r: PreliminaryMatchScoreRow) => r.candidateName ?? "—",
    },
    {
      header: "Vacante",
      render: (r: PreliminaryMatchScoreRow) => r.vacancyTitle ?? "—",
    },
    {
      header: "Cliente",
      render: (r: PreliminaryMatchScoreRow) => clientLabel(r),
    },
    {
      header: "Score (0–100)",
      numeric: true,
      render: (r: PreliminaryMatchScoreRow) => {
        const v = preliminaryMatchScoreValue(r)
        return v == null ? "—" : `${v.toFixed(0)}%`
      },
    },
    {
      header: "Nivel",
      render: (r: PreliminaryMatchScoreRow) => levelLabel(r),
    },
    {
      header: "Estado",
      render: (r: PreliminaryMatchScoreRow) => statusLabel(r),
    },
    {
      header: "Etapa",
      render: (r: PreliminaryMatchScoreRow) =>
        (r.stageName ?? r.stageId ?? "—").toString(),
    },
    {
      header: "Fecha análisis",
      render: (r: PreliminaryMatchScoreRow) =>
        formatReportDate(r.analyzedAt ?? r.evaluatedAt ?? r.createdAt),
    },
  ] as const

  const csvMatrix = useMemo(() => {
    const header = [
      "Candidato",
      "Vacante",
      "Cliente",
      "Score",
      "Nivel",
      "Estado",
      "Etapa",
      "Fecha análisis",
    ]
    const body = rows.map((r) => [
      r.candidateName ?? "",
      r.vacancyTitle ?? "",
      clientLabel(r),
      (() => {
        const v = preliminaryMatchScoreValue(r)
        return v == null ? "" : String(v)
      })(),
      levelLabel(r),
      statusLabel(r),
      String(r.stageName ?? r.stageId ?? ""),
      formatReportDate(r.analyzedAt ?? r.evaluatedAt ?? r.createdAt),
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
        ? `${totalCount} ${totalCount === 1 ? "fila" : "filas"}`
        : ""

  return (
    <RrhhReportsShell breadcrumbLabel="Reportes" breadcrumbTrail={trail}>
      <div className="min-w-0 flex flex-col gap-6 pb-10">
        <section className="px-4 pt-6 md:px-8" aria-label="Encabezado del reporte">
          <PortalPageHeader
            title="Scores matching preliminar"
            description="Detalle por candidato o postulación: score 0–100, nivel, estado y fechas según el API."
          />
        </section>
        <section className="space-y-4 px-4 md:px-8" aria-label="Filtros y tabla del reporte">
          <ReportesFiltersPlaceholder>
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
          <ReportesQueryActions
            statusText={statusLine}
            loading={loading}
            onApply={handleApplyFilters}
            extra={
              <ReportesExportToolbar
                reportSlug="preliminary-match-scores"
                disabled={loading || !!error}
                matrix={csvMatrix}
              />
            }
          />
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
          <ReportesDataTable<PreliminaryMatchScoreRow>
            columns={columns}
            rows={rows}
            loading={loading}
            error={error}
            tableAriaLabel="Tabla scores matching preliminar"
            getRowKey={(r, i) =>
              String(
                `${r.candidateId ?? r.candidateProfileId}-${r.vacancyId}-${r.analyzedAt ?? i}`
              )
            }
          />
        </section>
      </div>
    </RrhhReportsShell>
  )
}
