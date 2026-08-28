"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
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

function ReportHubCardSkeleton() {
  return (
    <div
      className="flex animate-pulse flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
      aria-hidden
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="h-3 w-full max-w-xl rounded bg-muted" />
        </div>
      </div>
      <div className="h-4 w-32 shrink-0 rounded bg-muted" />
    </div>
  )
}

export function ReportsHubClient() {
  const t = useTranslations("RecruiterPortal.reports")
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
        setCatalogError(t("errors.catalogForbidden"))
      } else {
        setCatalogError(
          getApiErrorMessage(err) || t("errors.catalogLoadFailed")
        )
      }
      setCatalog([])
    } finally {
      if (!signal.aborted) setCatalogLoading(false)
    }
  }, [t])

  useEffect(() => {
    const controller = new AbortController()
    void loadCatalog(controller.signal)
    return () => controller.abort()
  }, [loadCatalog, catalogRetryKey])

  const handleRetryCatalog = () => setCatalogRetryKey((k) => k + 1)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
        aria-label={t("catalog.regionLabel")}
        aria-busy={catalogLoading}
      >
        {catalogLoading ? (
          <div className="flex flex-col gap-3 pb-2">
            <ReportHubCardSkeleton />
            <ReportHubCardSkeleton />
          </div>
        ) : null}

        {!catalogLoading && catalogError ? (
          <div
            className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                aria-hidden
              />
              <div className="space-y-1">
                <p className="font-sans text-sm font-medium text-foreground">
                  {t("errors.catalogLoadTitle")}
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
              aria-label={t("actions.retry")}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {t("actions.retry")}
            </button>
          </div>
        ) : null}

        {!catalogLoading && !catalogError && catalog.length === 0 ? (
          <p className="font-sans text-sm text-muted-foreground" role="status">
            {t("emptyStates.noCatalog")}
          </p>
        ) : null}

        {!catalogLoading && !catalogError && catalog.length > 0 ? (
          <ul className="flex flex-col gap-3 pb-2" role="list">
            {catalog.map((item) => {
              const Icon = getReportCatalogIcon(item.reportKey)
              const description =
                item.description?.trim() || t("catalog.descriptionFallback")
              const linkedTemplateId = item.linkedTemplate?.templateId?.trim()
              const href = linkedTemplateId
                ? buildReportKeyHubHref(item.reportKey)
                : undefined
              const badge = item.linkedTemplate?.name
                ? t("cards.templateBadge", { name: item.linkedTemplate.name })
                : undefined
              return (
                <li key={item.reportKey}>
                  <ReportHubCatalogCard
                    title={item.name}
                    description={description}
                    icon={Icon}
                    href={href}
                    badge={badge}
                    unlinkedHint={t("catalog.unlinkedHint")}
                  />
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
