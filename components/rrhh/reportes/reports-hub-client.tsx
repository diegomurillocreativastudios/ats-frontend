"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, FileText, RefreshCw } from "lucide-react"
import { ReportHubLinkCard } from "@/components/rrhh/reportes/report-hub-link-card"
import { getApiErrorMessage } from "@/lib/api-error"
import { buildReportTemplateHubHref, REPORT_LINKS } from "@/lib/reportes/report-links"
import {
  fetchTemplatesList,
  filterReportDocumentTemplates,
  sortReportDocumentTemplates,
  type TemplateListItem,
} from "@/lib/templates/technical-sheet-template"

const TEMPLATE_DESCRIPTION =
  "Reporte configurado desde plantillas. Abrí para ver el detalle y preparar la generación con datos."

function ReportHubCardSkeleton() {
  return (
    <div
      className="flex animate-pulse flex-col gap-3 rounded-xl border border-border bg-card p-5"
      aria-hidden
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-lg bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

export function ReportsHubClient() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const loadTemplates = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchTemplatesList({ documentOnly: true })
      if (signal.aborted) return
      const reports = sortReportDocumentTemplates(filterReportDocumentTemplates(list))
      setTemplates(reports)
    } catch (err: unknown) {
      if (signal.aborted) return
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: number }).status)
          : 0
      if (status === 401 || status === 403) {
        setError("No tenés permisos para ver las plantillas de reporte.")
      } else {
        setError(getApiErrorMessage(err) || "No se pudieron cargar las plantillas de reporte.")
      }
      setTemplates([])
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadTemplates(controller.signal)
    return () => controller.abort()
  }, [loadTemplates, retryKey])

  const handleRetry = () => setRetryKey((k) => k + 1)

  return (
    <>
      <section className="px-4 pb-2 md:px-8" aria-labelledby="report-templates-heading">
        <h2
          id="report-templates-heading"
          className="font-sans text-sm font-semibold text-foreground"
        >
          Plantillas de reporte
        </h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Reportes definidos en administración con la marca «Reporte».
        </p>
      </section>

      <section
        className="grid gap-4 px-4 pb-8 md:grid-cols-2 md:px-8"
        aria-label="Plantillas de reporte"
        aria-busy={loading}
      >
        {loading ? (
          <>
            <ReportHubCardSkeleton />
            <ReportHubCardSkeleton />
          </>
        ) : null}

        {!loading && error ? (
          <div
            className="col-span-full flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5 md:col-span-2"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
              <div className="space-y-1">
                <p className="font-sans text-sm font-medium text-foreground">
                  No se pudieron cargar las plantillas
                </p>
                <p className="font-sans text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reintentar
            </button>
          </div>
        ) : null}

        {!loading && !error && templates.length === 0 ? (
          <p
            className="col-span-full font-sans text-sm text-muted-foreground md:col-span-2"
            role="status"
          >
            No hay plantillas de reporte configuradas. Marcá una plantilla Documento como
            «Reporte» en administración.
          </p>
        ) : null}

        {!loading && !error
          ? templates.map((template) => (
              <ReportHubLinkCard
                key={String(template.id)}
                href={buildReportTemplateHubHref(template.id)}
                title={template.name}
                description={TEMPLATE_DESCRIPTION}
                badge="Plantilla"
                icon={FileText}
              />
            ))
          : null}
      </section>

      <section
        className="border-t border-border px-4 pb-2 pt-6 md:px-8"
        aria-labelledby="legacy-reports-heading"
      >
        <h2
          id="legacy-reports-heading"
          className="font-sans text-sm font-semibold text-foreground"
        >
          Reportes del sistema
        </h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Vistas actuales en transición. Se irán migrando a plantillas de reporte.
        </p>
      </section>

      <section
        className="grid gap-4 p-4 md:grid-cols-2 md:p-8 md:pt-4"
        aria-label="Reportes del sistema"
      >
        {REPORT_LINKS.map(({ href, title, description, Icon, badgeLabel }) => (
          <ReportHubLinkCard
            key={href}
            href={href}
            title={title}
            description={description}
            badge={badgeLabel}
            icon={Icon}
          />
        ))}
      </section>
    </>
  )
}
