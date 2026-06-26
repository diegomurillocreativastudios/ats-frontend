"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, ArrowLeft, Calendar, Loader2, Tag } from "lucide-react"
import { RrhhInterviewsShell } from "@/components/rrhh/interviews/rrhh-interviews-shell"
import { TechnicalSheetModal } from "@/components/rrhh/technical-sheet/technical-sheet-modal"
import { VacancyPipelineCharts } from "@/components/rrhh/vacancy-resultados/vacancy-pipeline-charts"
import { VacancyResultadosMetaPanel } from "@/components/rrhh/vacancy-resultados/vacancy-resultados-meta-panel"
import { VacancyResultadosKpisStrip } from "@/components/rrhh/vacancy-resultados/vacancy-resultados-kpis-strip"
import {
  VacancyResultadosCandidateFiltersBar,
  VacancyResultadosCandidatesBlock,
  type VacancyResultadosCandidateFiltersState,
} from "@/components/rrhh/vacancy-resultados/vacancy-resultados-candidates-block"
import {
  fetchVacancyResultadosPayload,
  type VacancyResultadosViewModel,
} from "@/lib/api/vacancy-resultados"
import { getInterviewsByVacancy, type Interview } from "@/lib/api/interviews"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatVacancyResultadosDocumentTitle } from "@/lib/pageTitles"

function formatDisplayDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const defaultFilters: VacancyResultadosCandidateFiltersState = {
  search: "",
  statusId: "all",
  scoreTier: "all",
}

export default function VacancyResultadosPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations("RecruiterPortal.vacancies.results")
  const tVacancies = useTranslations("RecruiterPortal.vacancies")
  const raw = params?.id
  const vacancyId = Array.isArray(raw) ? raw[0] : raw ?? ""

  const [model, setModel] = useState<VacancyResultadosViewModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [technicalSheetProfileId, setTechnicalSheetProfileId] = useState<
    string | null
  >(null)
  const [technicalSheetCandidateLabel, setTechnicalSheetCandidateLabel] =
    useState<string | null>(null)
  const [candidateFilters, setCandidateFilters] =
    useState<VacancyResultadosCandidateFiltersState>(defaultFilters)

  const load = useCallback(async () => {
    if (!vacancyId) {
      setLoading(false)
      setFetchError(t("errors.missingId"))
      setModel(null)
      return
    }
    setLoading(true)
    setFetchError(null)
    try {
      const data = await fetchVacancyResultadosPayload(vacancyId)
      setModel(data)
    } catch (err: unknown) {
      setFetchError(
        getApiErrorMessage(err) || t("errors.loadFailed")
      )
      setModel(null)
    } finally {
      setLoading(false)
    }
  }, [vacancyId, t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!vacancyId || !model) {
      setInterviews([])
      return
    }
    let cancelled = false
    getInterviewsByVacancy(vacancyId, {})
      .then((list) => {
        if (!cancelled) setInterviews(list)
      })
      .catch(() => {
        if (!cancelled) setInterviews([])
      })
    return () => {
      cancelled = true
    }
  }, [vacancyId, model])

  useEffect(() => {
    if (!vacancyId) return
    if (loading) return
    document.title = formatVacancyResultadosDocumentTitle(
      fetchError ? null : model?.title ?? null
    )
  }, [vacancyId, loading, fetchError, model?.title])

  const trail =
    vacancyId.length > 0
      ? [
          { label: tVacancies("breadcrumb"), href: "/portal-rrhh/vacantes" },
          {
            label: loading ? "…" : model?.title?.trim() || t("page.vacancyFallback"),
            href: `/portal-rrhh/vacantes/${encodeURIComponent(vacancyId)}`,
          },
          { label: t("page.breadcrumbResults") },
        ]
      : [{ label: tVacancies("breadcrumb"), href: "/portal-rrhh/vacantes" }]

  const handleScheduleFromResultados = (candidateProfileId: string) => {
    router.push(
      `/portal-rrhh/entrevistas/${encodeURIComponent(vacancyId)}?nueva=1&candidato=${encodeURIComponent(candidateProfileId)}`
    )
  }

  const createdLabel = model?.meta?.createdAt
    ? formatDisplayDate(model.meta.createdAt)
    : null
  const hasApplicants = Boolean(model && model.applicants.length > 0)

  return (
    <RrhhInterviewsShell breadcrumbLabel={tVacancies("breadcrumb")} breadcrumbTrail={trail}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {!vacancyId ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {t("errors.missingId")}
          </p>
        ) : loading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
            <p className="font-sans text-sm text-muted-foreground">
              {t("loadingStates.loading")}
            </p>
          </div>
        ) : fetchError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="font-sans text-sm text-destructive" role="alert">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 inline-flex items-center rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            >
              {tVacancies("actions.retry")}
            </button>
          </div>
        ) : model ? (
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("page.eyebrow")}
                </p>
                <h1 className="mt-1 wrap-break-word font-sans text-2xl font-bold text-foreground sm:text-3xl">
                  {model.title?.trim() || t("page.untitledVacancy")}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {model.meta.status ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-sans text-xs font-semibold text-emerald-800">
                      {model.meta.status}
                    </span>
                  ) : null}
                  {model.meta.jobCategory ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-3 py-1 font-sans text-xs text-foreground">
                      <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      {model.meta.jobCategory}
                    </span>
                  ) : null}
                  {model.meta.needsRematch ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-sans text-xs font-medium text-amber-900">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {t("page.needsRematch")}
                    </span>
                  ) : null}
                  {createdLabel ? (
                    <span className="font-sans text-xs text-muted-foreground">
                      {t("page.createdPrefix")}{" "}
                      <span className="text-foreground">{createdLabel}</span>
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasApplicants ? (
                  <Link
                    href={`/portal-rrhh/entrevistas/${encodeURIComponent(vacancyId)}?nueva=1`}
                    className="inline-flex w-fit shrink-0 items-center gap-2 rounded-md bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                    aria-label={t("actions.scheduleInterviewAria")}
                  >
                    <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                    {t("actions.scheduleInterview")}
                  </Link>
                ) : null}
                <Link
                  href={`/portal-rrhh/entrevistas/${encodeURIComponent(vacancyId)}`}
                  className="inline-flex w-fit shrink-0 items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  aria-label={t("actions.interviewsAria")}
                >
                  <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                  {t("actions.interviews")}
                </Link>
                <Link
                  href={`/portal-rrhh/vacantes/${encodeURIComponent(vacancyId)}`}
                  className="inline-flex w-fit shrink-0 items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
                  aria-label={t("actions.backToVacancyAria")}
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  {t("actions.backToVacancy")}
                </Link>
              </div>
            </header>

            <VacancyResultadosMetaPanel
              vacancyTitle={model.title}
              meta={model.meta}
              hideVacancyHeading
            />

            <VacancyResultadosKpisStrip
              totalApplicants={model.applicants.length}
              scoreSummary={model.scoreSummary}
              byStage={model.byStage}
            />

            <VacancyResultadosCandidateFiltersBar
              companyStatuses={model.companyStatuses}
              filterState={candidateFilters}
              onFilterChange={setCandidateFilters}
            />

            <VacancyPipelineCharts
              componentAverages={model.componentAverages}
              byStage={model.byStage}
              scoreBuckets={model.scoreBuckets}
              scoreSummary={model.scoreSummary}
              totalApplicants={model.applicants.length}
            />

            <VacancyResultadosCandidatesBlock
              vacancyId={vacancyId}
              applicantsByStageFull={model.applicantsByStageFull}
              companyStatuses={model.companyStatuses}
              allApplicants={model.applicants}
              interviews={interviews}
              filterState={candidateFilters}
              onFilterChange={setCandidateFilters}
              onScheduleInterview={handleScheduleFromResultados}
              onOpenTechnicalSheet={(id, displayName) => {
                setTechnicalSheetProfileId(id)
                setTechnicalSheetCandidateLabel(displayName)
              }}
            />
          </div>
        ) : null}
      </div>

      {technicalSheetProfileId ? (
        <TechnicalSheetModal
          isOpen={technicalSheetProfileId != null}
          onClose={() => {
            setTechnicalSheetProfileId(null)
            setTechnicalSheetCandidateLabel(null)
          }}
          vacancyId={vacancyId}
          candidateProfileId={technicalSheetProfileId}
          vacancyTitle={model?.title ?? null}
          candidateLabel={
            technicalSheetCandidateLabel?.trim() ||
            technicalSheetProfileId.slice(0, 8)
          }
        />
      ) : null}
    </RrhhInterviewsShell>
  )
}
