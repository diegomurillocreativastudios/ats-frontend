"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { GitBranch, Users } from "lucide-react"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import ReportesFiltersPlaceholder, {
  ReportesFilterControl,
} from "@/components/rrhh/reportes/reportes-filters-placeholder"
import ReportesDataTable from "@/components/rrhh/reportes/reportes-data-table"
import {
  EstatusCandidatosPorEtapaDashboard,
  DaysInStageCell,
  resolveDashboardStages,
  StagePill,
} from "@/components/rrhh/reportes/estatus-candidatos-por-etapa-dashboard"
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
} from "@/lib/reportes-metrics"

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

const PAGE_SIZE = 20

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

  const dashboardModel = useMemo(
    () => resolveDashboardStages(pipelineSummary, rows, totalCount),
    [pipelineSummary, rows, totalCount]
  )

  const effectiveListTotal =
    pipelineSummary != null && pipelineSummary.totalCandidates > 0
      ? pipelineSummary.totalCandidates
      : totalCount

  const dominantHeaderStage =
    dashboardModel.stages.length > 0 ? dashboardModel.stages[0] : null

  const headerLoading = loading || summaryLoading

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
      render: (r: CandidateStatusByStageRow) => (
        <StagePill text={candidateStageLabel(r)} />
      ),
    },
    {
      header: "Días en etapa",
      numeric: true,
      render: (r: CandidateStatusByStageRow) => <DaysInStageCell row={r} />,
    },
    {
      header: "Estatus",
      render: (r: CandidateStatusByStageRow) => (
        <StagePill text={r.pipelineStatus ?? r.applicationStatus ?? "—"} />
      ),
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

  const statusLine =
    !loading && !error && totalCount > 0
      ? `Mostrando ${showingFrom}–${showingTo} de ${totalCount}${summaryLoading ? " · cargando agregados…" : ""}`
      : !loading && !error
        ? `${totalCount} ${totalCount === 1 ? "fila" : "filas"}`
        : ""

  const summaryRibbon = (
    <aside
      className="w-full shrink-0 rounded-2xl border border-border/80 bg-white p-4 shadow-sm lg:max-w-[300px]"
      aria-label="Resumen del embudo"
    >
      <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Resumen del embudo
      </p>
      {headerLoading ? (
        <div className="mt-4 space-y-3" aria-hidden>
          <div className="h-8 animate-pulse rounded-lg bg-muted/70" />
          <div className="h-8 animate-pulse rounded-lg bg-muted/70" />
          <div className="h-8 animate-pulse rounded-lg bg-muted/70" />
        </div>
      ) : (
        <dl className="mt-4 space-y-4">
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-vo-purple" aria-hidden />
            <div>
              <dt className="font-sans text-xs text-muted-foreground">Total aplicaciones</dt>
              <dd className="font-sans text-2xl font-bold tabular-nums text-foreground">
                {effectiveListTotal}
              </dd>
            </div>
          </div>
          <div>
            <dt className="font-sans text-xs text-muted-foreground">Etapas con candidatos</dt>
            <dd className="font-sans text-lg font-semibold tabular-nums text-foreground">
              {dashboardModel.stages.length}
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-vo-purple" aria-hidden />
            <div className="min-w-0">
              <dt className="font-sans text-xs text-muted-foreground">Mayor concentración</dt>
              <dd className="truncate font-sans text-sm font-semibold text-foreground">
                {dominantHeaderStage?.name ?? "—"}
              </dd>
              {dominantHeaderStage ? (
                <p className="mt-0.5 font-sans text-[11px] text-muted-foreground">
                  {dominantHeaderStage.percent.toFixed(1)}% del total
                </p>
              ) : null}
            </div>
          </div>
        </dl>
      )}
    </aside>
  )

  const mainContent = (
    <div className="min-w-0 flex flex-col gap-6 pb-10">
      <section className="px-4 pt-6 md:px-8" aria-label="Encabezado del reporte">
        <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between">
          <PortalPageHeader
            className="border-0 pb-0"
            title="Estatus candidatos por etapa"
            description="Distribución actual de candidatos dentro del proceso de reclutamiento."
            contentClassName="max-w-3xl"
          />
          {summaryRibbon}
        </div>
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
        {!error ? (
          <EstatusCandidatosPorEtapaDashboard
            pipelineSummary={pipelineSummary}
            summaryLoading={summaryLoading}
            reportLoading={loading}
            pageRows={rows}
            listTotalCount={totalCount}
          />
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
          emptyDescription="No hay candidatos para los filtros seleccionados."
          onRetry={loadReport}
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
