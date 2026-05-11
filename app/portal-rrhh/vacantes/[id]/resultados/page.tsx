"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { RrhhInterviewsShell } from "@/components/rrhh/interviews/rrhh-interviews-shell"
import { VacancyPipelineCharts } from "@/components/rrhh/vacancy-resultados/vacancy-pipeline-charts"
import {
  fetchVacancyResultadosPayload,
  type VacancyResultadosViewModel,
} from "@/lib/api/vacancy-resultados"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatVacancyResultadosDocumentTitle } from "@/lib/pageTitles"

export default function VacancyResultadosPage() {
  const params = useParams()
  const raw = params?.id
  const vacancyId = Array.isArray(raw) ? raw[0] : raw ?? ""

  const [model, setModel] = useState<VacancyResultadosViewModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!vacancyId) {
      setLoading(false)
      setFetchError("Falta el identificador de la vacante.")
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
        getApiErrorMessage(err) || "No se pudieron cargar los resultados de la vacante."
      )
      setModel(null)
    } finally {
      setLoading(false)
    }
  }, [vacancyId])

  useEffect(() => {
    void load()
  }, [load])

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
          { label: "Vacantes", href: "/portal-rrhh/vacantes" },
          {
            label: loading ? "…" : model?.title?.trim() || "Vacante",
            href: `/portal-rrhh/vacantes/${encodeURIComponent(vacancyId)}`,
          },
          { label: "Resultados" },
        ]
      : [{ label: "Vacantes", href: "/portal-rrhh/vacantes" }]

  return (
    <RrhhInterviewsShell breadcrumbLabel="Vacantes" breadcrumbTrail={trail}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-sans text-xl font-bold text-foreground sm:text-2xl">
              Resultados del pipeline
            </h1>
            <p className="mt-1 max-w-2xl font-sans text-sm text-muted-foreground">
              Vista agregada de postulantes por etapa y distribución de puntajes para esta vacante.
            </p>
          </div>
          {vacancyId ? (
            <Link
              href={`/portal-rrhh/vacantes/${encodeURIComponent(vacancyId)}`}
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              aria-label="Volver al detalle de la vacante"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Volver a la vacante
            </Link>
          ) : null}
        </div>

        {!vacancyId ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            Falta el identificador de la vacante.
          </p>
        ) : loading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-vo-purple" aria-hidden />
            <p className="font-sans text-sm text-muted-foreground">Cargando resultados…</p>
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
              Reintentar
            </button>
          </div>
        ) : model ? (
          <VacancyPipelineCharts
            applicantsByStage={model.applicantsByStage}
            byStage={model.byStage}
            scoreBuckets={model.scoreBuckets}
            scoreSummary={model.scoreSummary}
            totalApplicants={model.applicants.length}
          />
        ) : null}
      </div>
    </RrhhInterviewsShell>
  )
}
