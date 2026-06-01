"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { ReportHubCatalogCard } from "@/components/rrhh/reportes/report-hub-catalog-card"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  fetchReportsCatalog,
  type ReportCatalogItem,
} from "@/lib/api/recruiter-reports-catalog"
import {
  buildReportKeyHubHref,
  getReportCatalogIcon,
} from "@/lib/reportes/report-links"

const CATALOG_DESCRIPTION_FALLBACK =
  "Reporte disponible. Aplicá filtros y descargá el resultado."

const CATALOG_UNLINKED_HINT =
  "Vinculá una plantilla de tipo Documento marcada como reporte desde administración."

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
  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogRetryKey, setCatalogRetryKey] = useState(0)

  const loadCatalog = useCallback(async (signal: AbortSignal) => {
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const items = await fetchReportsCatalog()
      if (signal.aborted) return
      setCatalog(items)
    } catch (err: unknown) {
      if (signal.aborted) return
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: number }).status)
          : 0
      if (status === 401 || status === 403) {
        setCatalogError(
          "No tenés permisos para ver el catálogo de reportes."
        )
      } else {
        setCatalogError(
          getApiErrorMessage(err) ||
            "No se pudo cargar el catálogo de reportes."
        )
      }
      setCatalog([])
    } finally {
      if (!signal.aborted) setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadCatalog(controller.signal)
    return () => controller.abort()
  }, [loadCatalog, catalogRetryKey])

  const handleRetryCatalog = () => setCatalogRetryKey((k) => k + 1)

  return (
    <>
      <section
        className="px-4 pb-2 md:px-8"
        aria-labelledby="catalog-reports-heading"
      >
        <h2
          id="catalog-reports-heading"
          className="font-sans text-sm font-semibold text-foreground"
        >
          Reportes
        </h2>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Reportes oficiales del sistema. Abrí cualquiera para aplicar filtros
          y descargar el PDF cuando tenga una plantilla vinculada.
        </p>
      </section>

      <section
        className="grid gap-4 px-4 pb-8 md:grid-cols-2 md:px-8"
        aria-label="Reportes disponibles para descargar"
        aria-busy={catalogLoading}
      >
        {catalogLoading ? (
          <>
            <ReportHubCardSkeleton />
            <ReportHubCardSkeleton />
          </>
        ) : null}

        {!catalogLoading && catalogError ? (
          <div
            className="col-span-full flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5 md:col-span-2"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                aria-hidden
              />
              <div className="space-y-1">
                <p className="font-sans text-sm font-medium text-foreground">
                  No se pudo cargar el catálogo de reportes
                </p>
                <p className="font-sans text-sm text-muted-foreground">
                  {catalogError}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetryCatalog}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              aria-label="Reintentar reportes"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reintentar reportes
            </button>
          </div>
        ) : null}

        {!catalogLoading && !catalogError && catalog.length === 0 ? (
          <p
            className="col-span-full font-sans text-sm text-muted-foreground md:col-span-2"
            role="status"
          >
            El catálogo de reportes aún no devuelve resultados.
          </p>
        ) : null}

        {!catalogLoading && !catalogError
          ? catalog.map((item) => {
              const Icon = getReportCatalogIcon(item.reportKey)
              const description =
                item.description?.trim() || CATALOG_DESCRIPTION_FALLBACK
              const linkedTemplateId = item.linkedTemplate?.templateId?.trim()
              const href = linkedTemplateId
                ? buildReportKeyHubHref(item.reportKey)
                : undefined
              const badge = item.linkedTemplate?.name
                ? `Plantilla: ${item.linkedTemplate.name}`
                : undefined
              return (
                <ReportHubCatalogCard
                  key={item.reportKey}
                  title={item.name}
                  description={description}
                  icon={Icon}
                  href={href}
                  badge={badge}
                  unlinkedHint={CATALOG_UNLINKED_HINT}
                />
              )
            })
          : null}
      </section>
    </>
  )
}
