"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import { ReportDataViewClient } from "@/components/rrhh/reportes/report-data-view-client"
import { ReportTemplateDetailClient } from "@/components/rrhh/reportes/report-template-detail-client"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  fetchReportsCatalog,
  type ReportCatalogItem,
} from "@/lib/api/recruiter-reports-catalog"
import { getReportTemplateMessages } from "@/lib/messages/report-template"

interface ReportByKeyResolverClientProps {
  reportKey: string
}

type ResolveResult =
  | { status: "loading" }
  | { status: "catalog"; item: ReportCatalogItem }
  | { status: "template"; templateId: string }
  | { status: "not-found"; message: string }
  | { status: "error"; message: string }

const NUMERIC_REPORT_KEY = /^\d+$/

function findCatalogItemByKey(
  catalog: ReportCatalogItem[],
  reportKey: string
): ReportCatalogItem | null {
  const target = reportKey.trim()
  if (!target) return null
  return catalog.find((item) => item.reportKey === target) ?? null
}

function ResolverShell({
  breadcrumbLabel,
  children,
  trail,
}: {
  breadcrumbLabel: string
  children: React.ReactNode
  trail?: Array<{ label: string; href?: string }> | null
}) {
  return (
    <RrhhReportsShell breadcrumbLabel={breadcrumbLabel} breadcrumbTrail={trail ?? null}>
      <div className="min-w-0 flex flex-col gap-6 px-4 pt-6 pb-10 md:px-8">
        {children}
      </div>
    </RrhhReportsShell>
  )
}

function ResolverErrorCard({
  title,
  description,
  backLabel,
}: {
  title: string
  description: string
  backLabel: string
}) {
  return (
    <div
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        <div className="space-y-1">
          <p className="font-sans text-sm font-medium text-foreground">{title}</p>
          <p className="font-sans text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Link
        href="/portal-rrhh/reportes"
        className="inline-flex w-fit items-center justify-center rounded-md bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
      >
        {backLabel}
      </Link>
    </div>
  )
}

export function ReportByKeyResolverClient({
  reportKey,
}: ReportByKeyResolverClientProps) {
  const tReport = useTranslations("RecruiterPortal.reports.templateDetail")
  const tResolver = useTranslations("RecruiterPortal.reports.resolver")
  const m = useMemo(() => getReportTemplateMessages(tReport), [tReport])
  const [resolution, setResolution] = useState<ResolveResult>({ status: "loading" })

  const resolve = useCallback(
    async (signal: AbortSignal) => {
      const segment = reportKey.trim()
      if (!segment) {
        setResolution({ status: "not-found", message: tResolver("notFoundDetail") })
        return
      }

      setResolution({ status: "loading" })

      try {
        const catalog = await fetchReportsCatalog()
        if (signal.aborted) return

        const match = findCatalogItemByKey(catalog, segment)
        if (match) {
          setResolution({ status: "catalog", item: match })
          return
        }

        if (NUMERIC_REPORT_KEY.test(segment)) {
          setResolution({ status: "template", templateId: segment })
          return
        }

        setResolution({ status: "not-found", message: tResolver("notFoundDetail") })
      } catch (err: unknown) {
        if (signal.aborted) return
        setResolution({
          status: "error",
          message: getApiErrorMessage(err) || m.errorGeneric,
        })
      }
    },
    [m.errorGeneric, reportKey, tResolver]
  )

  useEffect(() => {
    const controller = new AbortController()
    void resolve(controller.signal)
    return () => controller.abort()
  }, [resolve])

  if (resolution.status === "loading") {
    return (
      <ResolverShell breadcrumbLabel={tReport("breadcrumbReport")}>
        <div
          className="flex items-center gap-2 font-sans text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {tResolver("loading")}
        </div>
      </ResolverShell>
    )
  }

  if (resolution.status === "catalog") {
    return <ReportDataViewClient catalogItem={resolution.item} />
  }

  if (resolution.status === "template") {
    return <ReportTemplateDetailClient templateId={resolution.templateId} />
  }

  if (resolution.status === "not-found") {
    return (
      <ResolverShell breadcrumbLabel={tReport("breadcrumbReport")}>
        <ResolverErrorCard
          title={tResolver("notFound")}
          description={resolution.message}
          backLabel={tResolver("backToReports")}
        />
      </ResolverShell>
    )
  }

  return (
    <ResolverShell breadcrumbLabel={tReport("breadcrumbReport")}>
      <ResolverErrorCard
        title={tResolver("openFailed")}
        description={resolution.message}
        backLabel={tResolver("backToReports")}
      />
    </ResolverShell>
  )
}
