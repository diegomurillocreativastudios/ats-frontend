"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, FileDown, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { ExecutiveSummaryReportPdfTemplate } from "@/components/recruiter/reports/executive-summary-report-pdf-template"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import { ReportFilterRenderer } from "@/components/rrhh/reportes/report-filter-renderer"
import ReportesFiltersPlaceholder from "@/components/rrhh/reportes/reportes-filters-placeholder"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  fetchReportTemplateConfig,
  generateReportDocumentPreview,
  uploadReportDocumentPdf,
} from "@/lib/api/report-documents"
import {
  fetchReportsSummary,
  listRecruiterCompanies,
  type RecruiterCompanyOption,
  type ReportsRecruiterSummary,
} from "@/lib/api/recruiter-reports"
import { getReportTemplateMessages } from "@/lib/messages/report-template"
import { captureElementAsPdfBlob } from "@/lib/pdf/download-element-as-pdf"
import { resolveReportPdfCaptureElement } from "@/lib/pdf/resolve-report-preview-pdf-element"
import {
  formatGeneratedAtForPdf,
  formatIsoDateForPdf,
} from "@/lib/reportes/executive-summary-metrics"
import { buildLegacyExecutiveSummaryReportConfig } from "@/lib/reportes/legacy-executive-summary-report-config"
import {
  mapPreviewContextToExecutivePdfData,
  mapPreviewContextToPdfFilters,
  mapSummaryPreviewToExecutivePdfData,
} from "@/lib/reportes/map-report-preview-context"
import { wrapReportPreviewHtml } from "@/lib/reportes/report-preview-html"
import { buildReportTemplateContext } from "@/lib/reportes/report-template-context"
import type { ReportTemplateConfig } from "@/lib/reportes/report-document-types"
import { renderTechnicalSheetHtml } from "@/lib/technical-sheet/template-interpolate"
import {
  fetchTemplateById,
  type TemplateListItem,
} from "@/lib/templates/technical-sheet-template"

interface ReportTemplateDetailClientProps {
  templateId: string
}

const applyButtonClass =
  "inline-flex w-full items-center justify-center rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-60 lg:w-auto lg:shrink-0"

const filterGridClass =
  "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] lg:items-end"

const pdfButtonClass =
  "inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

const badgeClass =
  "inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-sans text-xs font-medium text-muted-foreground"

function slugifyReportFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .slice(0, 48) || "reporte"
  )
}

function cloneFilters(filters: Record<string, unknown>): Record<string, unknown> {
  return { ...filters }
}

function hasPreviewContext(ctx: Record<string, unknown> | null): boolean {
  if (!ctx) return false
  return Object.keys(ctx).length > 0
}

export function ReportTemplateDetailClient({ templateId }: ReportTemplateDetailClientProps) {
  const tReport = useTranslations("RecruiterPortal.reports.templateDetail")
  const m = useMemo(() => getReportTemplateMessages(tReport), [tReport])
  const pdfCaptureRef = useRef<HTMLDivElement>(null)
  const initialPreviewDoneRef = useRef(false)

  const [template, setTemplate] = useState<TemplateListItem | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(true)

  const [reportConfig, setReportConfig] = useState<ReportTemplateConfig | null>(null)
  const [isLegacyConfig, setIsLegacyConfig] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)

  const [companies, setCompanies] = useState<RecruiterCompanyOption[]>([])
  const [draftFilters, setDraftFilters] = useState<Record<string, unknown>>({})
  const [appliedFilters, setAppliedFilters] = useState<Record<string, unknown>>({})

  const [previewContext, setPreviewContext] = useState<Record<string, unknown> | null>(null)
  const [legacySummary, setLegacySummary] = useState<ReportsRecruiterSummary | null>(null)
  const [previewHistoryId, setPreviewHistoryId] = useState<string | null>(null)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [previewSrcDoc, setPreviewSrcDoc] = useState<string | null>(null)
  const [previewInnerHtml, setPreviewInnerHtml] = useState<string | null>(null)
  const [useReactPreview, setUseReactPreview] = useState(false)

  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [savingPdf, setSavingPdf] = useState(false)
  const [pdfActionError, setPdfActionError] = useState<string | null>(null)
  const [pdfWarning, setPdfWarning] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: "success" | "error" | "warning" | "info"
    message: string
  }>({ open: false, variant: "success", message: "" })

  const showSnackbar = useCallback(
    (variant: "success" | "error" | "warning" | "info", message: string) => {
      setSnackbar({ open: true, variant, message })
    },
    []
  )

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }, [])

  const resolveClientName = useCallback(
    (clientId: string) => {
      if (!clientId.trim()) return "Todos"
      return companies.find((c) => c.id === clientId)?.name?.trim() || m.clientFallback
    },
    [companies]
  )

  const loadTemplate = useCallback(async (signal: AbortSignal) => {
    const id = templateId.trim()
    if (!id) {
      setTemplateError(m.errorInvalidId)
      setTemplate(null)
      setLoadingTemplate(false)
      return
    }

    setLoadingTemplate(true)
    setTemplateError(null)
    setTemplate(null)

    try {
      const result = await fetchTemplateById(id)
      if (signal.aborted) return
      if (!result) {
        setTemplateError(m.errorNoTemplate)
        return
      }
      setTemplate(result)
    } catch (err: unknown) {
      if (signal.aborted) return
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: number }).status)
          : 0
      if (status === 401 || status === 403) {
        setTemplateError(m.errorForbidden)
      } else {
        setTemplateError(getApiErrorMessage(err) || m.errorGeneric)
      }
    } finally {
      if (!signal.aborted) setLoadingTemplate(false)
    }
  }, [templateId])

  const loadConfig = useCallback(async (signal: AbortSignal) => {
    const id = templateId.trim()
    if (!id) {
      setLoadingConfig(false)
      return
    }

    setLoadingConfig(true)
    setConfigError(null)

    try {
      const remote = await fetchReportTemplateConfig(id)
      if (signal.aborted) return

      if (remote) {
        setReportConfig(remote)
        setIsLegacyConfig(false)
        const defaults = cloneFilters(remote.defaultFilters ?? {})
        setDraftFilters(defaults)
        setAppliedFilters(defaults)
        return
      }

      const legacy = buildLegacyExecutiveSummaryReportConfig()
      setReportConfig(legacy)
      setIsLegacyConfig(true)
      const defaults = cloneFilters(legacy.defaultFilters)
      setDraftFilters(defaults)
      setAppliedFilters(defaults)
    } catch (err: unknown) {
      if (signal.aborted) return
      setConfigError(getApiErrorMessage(err) || m.errorGeneric)
    } finally {
      if (!signal.aborted) setLoadingConfig(false)
    }
  }, [templateId])

  useEffect(() => {
    const controller = new AbortController()
    void loadTemplate(controller.signal)
    return () => controller.abort()
  }, [loadTemplate])

  useEffect(() => {
    if (!template || templateError) return
    const controller = new AbortController()
    void loadConfig(controller.signal)
    return () => controller.abort()
  }, [template, templateError, loadConfig])

  useEffect(() => {
    listRecruiterCompanies()
      .then(setCompanies)
      .catch(() => setCompanies([]))
  }, [])

  const generatePreview = useCallback(
    async (
      signal: AbortSignal,
      filters: Record<string, unknown>,
      options?: { notifyOnSuccess?: boolean }
    ) => {
      if (!template || !reportConfig) return

      setGeneratingPreview(true)
      setPreviewError(null)
      setPreviewContext(null)
      setLegacySummary(null)
      setPreviewHistoryId(null)
      setPreviewSrcDoc(null)
      setPreviewInnerHtml(null)
      setUseReactPreview(false)

      try {
        if (isLegacyConfig) {
          const data = await fetchReportsSummary({
            clientId: String(filters.clientId ?? "").trim() || undefined,
            dateFrom: String(filters.dateFrom ?? "").trim() || undefined,
            dateTo: String(filters.dateTo ?? "").trim() || undefined,
          })
          if (signal.aborted) return
          setLegacySummary(data)

          const publicBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
          const windowOrigin =
            typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : ""
          const origin = publicBase || windowOrigin
          const logoUrl = origin ? `${origin}/visible-icon.png` : ""
          const pdfFilters = {
            clientName: resolveClientName(String(filters.clientId ?? "")),
            from: formatIsoDateForPdf(String(filters.dateFrom ?? "")),
            to: formatIsoDateForPdf(String(filters.dateTo ?? "")),
          }
          const ctx = buildReportTemplateContext({
            summary: data,
            filters: pdfFilters,
            logoUrl,
            generatedAt: formatGeneratedAtForPdf(),
          })
          setPreviewContext(ctx)
          if (options?.notifyOnSuccess) {
            showSnackbar("success", "Vista previa generada correctamente.")
          }
          return
        }

        const preview = await generateReportDocumentPreview({
          templateId: templateId.trim(),
          filters,
        })
        if (signal.aborted) return

        setPreviewHistoryId(preview.historyId ?? null)
        setPreviewContext(preview.context ?? {})

        if (preview.config) {
          setReportConfig(preview.config)
        }
        if (preview.filtersApplied) {
          setAppliedFilters(cloneFilters(preview.filtersApplied))
        }
        if (options?.notifyOnSuccess) {
          showSnackbar("success", "Vista previa generada correctamente.")
        }
      } catch (err: unknown) {
        if (signal.aborted) return
        const msg = getApiErrorMessage(err) || m.errorPreview
        setPreviewError(msg)
        if (options?.notifyOnSuccess) {
          showSnackbar("error", msg)
        }
      } finally {
        if (!signal.aborted) setGeneratingPreview(false)
      }
    },
    [isLegacyConfig, reportConfig, resolveClientName, showSnackbar, template, templateId]
  )

  useEffect(() => {
    if (!template || loadingTemplate || templateError) return
    if (!reportConfig || loadingConfig || configError) return
    if (initialPreviewDoneRef.current) return

    initialPreviewDoneRef.current = true
    const controller = new AbortController()
    void generatePreview(controller.signal, appliedFilters)
    return () => controller.abort()
  }, [
    template,
    loadingTemplate,
    templateError,
    reportConfig,
    loadingConfig,
    configError,
    appliedFilters,
    generatePreview,
  ])

  const pdfFilters = useMemo(() => {
    if (previewContext) {
      return mapPreviewContextToPdfFilters(previewContext, appliedFilters, resolveClientName)
    }
    return {
      clientName: resolveClientName(String(appliedFilters.clientId ?? "")),
      from: formatIsoDateForPdf(String(appliedFilters.dateFrom ?? "")),
      to: formatIsoDateForPdf(String(appliedFilters.dateTo ?? "")),
    }
  }, [appliedFilters, previewContext, resolveClientName])

  const pdfData = useMemo(() => {
    if (previewContext) {
      return mapPreviewContextToExecutivePdfData(previewContext)
    }
    if (legacySummary) {
      return mapSummaryPreviewToExecutivePdfData(legacySummary)
    }
    return null
  }, [legacySummary, previewContext])

  useEffect(() => {
    if (!template || !previewContext) {
      setPreviewSrcDoc(null)
      setPreviewInnerHtml(null)
      setUseReactPreview(false)
      return
    }

    const rawTemplate = template.contentTemplate?.trim() ?? ""
    if (!rawTemplate) {
      setPreviewSrcDoc(null)
      setPreviewInnerHtml(null)
      setUseReactPreview(true)
      return
    }

    const rendered = renderTechnicalSheetHtml(rawTemplate, previewContext)
    setPreviewInnerHtml(rendered)
    setPreviewSrcDoc(wrapReportPreviewHtml(rendered))
    setUseReactPreview(false)
  }, [template, previewContext])

  const handleApplyFilters = () => {
    const next = cloneFilters(draftFilters)
    setAppliedFilters(next)
    const controller = new AbortController()
    void generatePreview(controller.signal, next, { notifyOnSuccess: true })
  }

  const waitForCaptureReady = async (captureTarget: HTMLElement) => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    const images = captureTarget.querySelectorAll("img")
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve()
              return
            }
            const done = () => resolve()
            img.addEventListener("load", done, { once: true })
            img.addEventListener("error", done, { once: true })
          })
      )
    )
  }

  const handleDownloadPdf = useCallback(async () => {
    setPdfActionError(null)
    setPdfWarning(null)
    setDownloadingPdf(true)

    const orientation = reportConfig?.pdfOrientation ?? "landscape"
    const format = reportConfig?.pdfFormat ?? "a4"
    const baseName = slugifyReportFileName(template?.name ?? "reporte")
    const fileName = `${baseName}-${String(templateId).slice(0, 8)}.pdf`

    try {
      const captureTarget = resolveReportPdfCaptureElement(pdfCaptureRef.current)
      if (!captureTarget) {
        setPdfActionError(m.pdfExportFailed)
        return
      }

      await waitForCaptureReady(captureTarget)

      const blob = await captureElementAsPdfBlob({
        element: captureTarget,
        orientation,
        format,
        scale: 2,
        marginMm: 5,
      })

      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = fileName
      anchor.rel = "noopener"
      anchor.click()
      URL.revokeObjectURL(objectUrl)

      if (previewHistoryId) {
        setSavingPdf(true)
        try {
          await uploadReportDocumentPdf({
            historyId: previewHistoryId,
            file: blob,
            fileName,
          })
          showSnackbar("success", "PDF guardado en el historial correctamente.")
        } catch {
          setPdfWarning(m.pdfHistoryWarning)
          showSnackbar("warning", m.pdfHistoryWarning)
        } finally {
          setSavingPdf(false)
        }
      }
    } catch {
      setPdfActionError(m.pdfExportFailed)
      showSnackbar("error", m.pdfExportFailed)
    } finally {
      setDownloadingPdf(false)
    }
  }, [
    previewHistoryId,
    reportConfig?.pdfFormat,
    reportConfig?.pdfOrientation,
    showSnackbar,
    template?.name,
    templateId,
  ])

  const trail = template
    ? [{ label: m.breadcrumbReports, href: "/portal-rrhh/reportes" }, { label: template.name }]
    : [{ label: m.breadcrumbReports, href: "/portal-rrhh/reportes" }, { label: m.breadcrumbReport }]

  const breadcrumbLabel = template?.name ?? m.breadcrumbReport
  const busy = loadingTemplate || loadingConfig || generatingPreview
  const hasPreviewData = hasPreviewContext(previewContext)
  const hasPdfCaptureSource =
    (useReactPreview && pdfData != null) ||
    (previewInnerHtml != null && previewInnerHtml.trim() !== "")
  const canDownload =
    !busy &&
    !templateError &&
    !configError &&
    !previewError &&
    hasPreviewData &&
    hasPdfCaptureSource

  const reportKeyLabel = reportConfig?.reportKey ?? "—"
  const pdfBusy = downloadingPdf || savingPdf

  return (
    <>
    <RrhhReportsShell breadcrumbLabel={breadcrumbLabel} breadcrumbTrail={trail}>
      <div className="min-w-0 flex flex-col gap-6 px-4 py-6 pb-10 md:px-8">
        {loadingTemplate ? (
          <div
            className="flex items-center gap-2 font-sans text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {m.loading}
          </div>
        ) : null}

        {!loadingTemplate && templateError ? (
          <div
            className="flex max-w-lg flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
              <div className="space-y-1">
                <p className="font-sans text-sm font-medium text-foreground">
                  No se pudo abrir el reporte
                </p>
                <p className="font-sans text-sm text-muted-foreground">{templateError}</p>
              </div>
            </div>
            <Link
              href="/portal-rrhh/reportes"
              className="inline-flex w-fit items-center justify-center rounded-md bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            >
              {m.backToReports}
            </Link>
          </div>
        ) : null}

        {!loadingTemplate && !templateError && template ? (
          <>
            <section aria-label={m.headerAria}>
              <PortalPageHeader
                title={template.name}
                titleClassName="text-2xl font-bold tracking-tight text-foreground md:text-3xl"
                description="Vista previa del reporte con los datos del periodo seleccionado."
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={badgeClass} title={m.reportKeyBadge}>
                      {m.reportKeyBadge}: {reportKeyLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDownloadPdf()
                      }}
                      disabled={!canDownload || pdfBusy}
                      data-html2canvas-ignore="true"
                      className={pdfButtonClass}
                      aria-busy={pdfBusy || undefined}
                    >
                      {pdfBusy ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      ) : (
                        <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                      {downloadingPdf
                        ? m.downloadingPdf
                        : savingPdf
                          ? m.savingPdf
                          : m.downloadPdf}
                    </button>
                  </div>
                }
              />
            </section>

            {loadingConfig ? (
              <div className="flex items-center gap-2 font-sans text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {m.loadingConfig}
              </div>
            ) : null}

            {configError ? (
              <p className="font-sans text-sm text-destructive" role="alert">
                {configError}
              </p>
            ) : null}

            {!loadingConfig && !configError && reportConfig?.filterSchema.fields.length === 0 ? (
              <p className="font-sans text-sm text-amber-700 dark:text-amber-400" role="status">
                {m.errorNoConfig}
              </p>
            ) : null}

            {isLegacyConfig ? (
              <p className="font-sans text-xs text-muted-foreground" role="note">
                {m.legacyModeHint}
              </p>
            ) : null}

            {pdfActionError ? (
              <p className="font-sans text-sm text-destructive" role="alert">
                {pdfActionError}
              </p>
            ) : null}

            {pdfWarning ? (
              <p
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-sans text-sm text-amber-900 dark:text-amber-100"
                role="status"
              >
                {pdfWarning}
              </p>
            ) : null}

            {!loadingConfig && !configError && reportConfig ? (
              <section className="space-y-4" aria-label={m.filtersAria} data-report-pdf-exclude>
                <ReportesFiltersPlaceholder hintText={m.filtersHint} controlsClassName={filterGridClass}>
                  <ReportFilterRenderer
                    schema={reportConfig.filterSchema}
                    value={draftFilters}
                    onChange={setDraftFilters}
                    disabled={generatingPreview}
                  />
                  <div className="flex w-full min-w-0 flex-col justify-end gap-1 sm:col-span-2 lg:col-span-1">
                    <button
                      type="button"
                      onClick={handleApplyFilters}
                      className={applyButtonClass}
                      disabled={generatingPreview || loadingConfig}
                    >
                      {m.applyFilters}
                    </button>
                  </div>
                </ReportesFiltersPlaceholder>
              </section>
            ) : null}

            {generatingPreview ? (
              <div className="flex items-center gap-2 font-sans text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {m.loadingData}
              </div>
            ) : null}

            {previewError ? (
              <p className="font-sans text-sm text-destructive" role="alert">
                {previewError}
              </p>
            ) : null}

            {!generatingPreview && !previewError && hasPreviewData ? (
              <section aria-label={m.previewTitle} className="flex min-h-0 flex-col gap-4">
                {useReactPreview && pdfData ? (
                  <div className="flex min-h-0 w-full justify-center overflow-x-auto rounded-lg border border-border bg-muted/15 p-4">
                    <ExecutiveSummaryReportPdfTemplate
                      data={pdfData}
                      filters={pdfFilters}
                      generatedAt={formatGeneratedAtForPdf()}
                    />
                  </div>
                ) : previewSrcDoc ? (
                  <div className="flex min-h-[480px] w-full flex-col overflow-hidden rounded-lg border border-border bg-muted/15">
                    <iframe
                      title={m.previewTitle}
                      sandbox="allow-same-origin"
                      srcDoc={previewSrcDoc}
                      className="min-h-[480px] w-full flex-1 border-0 bg-white"
                    />
                  </div>
                ) : (
                  <p className="font-sans text-sm text-muted-foreground" role="status">
                    {m.errorNoContent}
                  </p>
                )}
              </section>
            ) : null}

            {!generatingPreview && !previewError && !hasPreviewData && !loadingConfig && !configError ? (
              <p className="font-sans text-sm text-muted-foreground" role="status">
                {m.errorNoData}
              </p>
            ) : null}

            <Link
              href="/portal-rrhh/reportes"
              className="inline-flex w-fit items-center justify-center rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              data-html2canvas-ignore="true"
            >
              {m.backToReports}
            </Link>
          </>
        ) : null}
      </div>

      {!loadingTemplate && !templateError && template && hasPreviewData && !previewError ? (
        <div
          ref={pdfCaptureRef}
          className="pointer-events-none fixed left-[-12000px] top-0 z-[-1] overflow-visible bg-white"
          aria-hidden
        >
          {useReactPreview && pdfData ? (
            <ExecutiveSummaryReportPdfTemplate
              data={pdfData}
              filters={pdfFilters}
              generatedAt={formatGeneratedAtForPdf()}
            />
          ) : previewInnerHtml ? (
            <main
              className="report-preview-doc w-[1600px] bg-white px-8 py-7 text-slate-950"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
              dangerouslySetInnerHTML={{ __html: previewInnerHtml }}
            />
          ) : null}
        </div>
      ) : null}
    </RrhhReportsShell>
    <Snackbar
      open={snackbar.open}
      onClose={handleCloseSnackbar}
      variant={snackbar.variant}
      message={snackbar.message}
    />
    </>
  )
}
