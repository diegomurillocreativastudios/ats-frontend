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
  UPLOAD_MAX_BYTES_20_MB,
  getUploadApiErrorMessage,
} from "@/lib/upload-constraints"
import { APP_LOGO_SVG_SRC } from "@/lib/app-brand"
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
import { downloadReportPdfFromServer } from "@/lib/pdf/download-report-pdf-from-server"
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
import {
  REPORT_PRINT_PREVIEW_SCREEN_ZOOM,
  wrapReportPreviewHtml,
} from "@/lib/reportes/report-preview-html"
import { buildReportTemplateContext } from "@/lib/reportes/report-template-context"
import {
  supportsSchemaReportPipeline,
} from "@/lib/reportes/report-template-context-registry"
import type { ReportTemplateConfig } from "@/lib/reportes/report-document-types"
import { safeParseReportSchema } from "@/lib/reportes/schema/report-schema"
import { renderReportSchemaToHtml } from "@/lib/reportes/schema/render-report-schema-to-html"
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

function escapePreviewHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderSchemaErrorHtml(message: string): string {
  return `<section class="report-template-error"><h2>Plantilla de reporte inválida</h2><p>${escapePreviewHtml(
    message
  )}</p><p>Revisá el JSON guardado en Administración → Plantillas.</p></section>`
}

function coercePreviewRows(context: Record<string, unknown> | null): unknown[] {
  if (!context) return []
  const rows = context.rows
  if (!Array.isArray(rows)) return []
  return rows.filter((row) => row != null && typeof row === "object")
}

export function ReportTemplateDetailClient({ templateId }: ReportTemplateDetailClientProps) {
  const tReport = useTranslations("RecruiterPortal.reports.templateDetail")
  const m = useMemo(() => getReportTemplateMessages(tReport), [tReport])
  const reactPreviewRef = useRef<HTMLDivElement>(null)
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
          const logoUrl = origin ? `${origin}${APP_LOGO_SVG_SRC}` : ""
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
      setUseReactPreview(false)
      return
    }

    const rawTemplate = template.contentTemplate?.trim() ?? ""
    if (!rawTemplate) {
      setPreviewSrcDoc(null)
      setUseReactPreview(true)
      return
    }

    const reportKey = reportConfig?.reportKey?.trim() ?? ""
    if (reportKey && !supportsSchemaReportPipeline(reportKey)) {
      setPreviewSrcDoc(
        wrapReportPreviewHtml(
          renderSchemaErrorHtml(
            `Este reporte (${reportKey}) no tiene pipeline de esquema JSON configurado.`
          ),
          { screenZoom: REPORT_PRINT_PREVIEW_SCREEN_ZOOM }
        )
      )
      setUseReactPreview(false)
      return
    }

    const parsed = safeParseReportSchema(rawTemplate)
    if (parsed.success === false) {
      setPreviewSrcDoc(
        wrapReportPreviewHtml(renderSchemaErrorHtml(parsed.error), {
          screenZoom: REPORT_PRINT_PREVIEW_SCREEN_ZOOM,
        })
      )
      setUseReactPreview(false)
      return
    }

    const rendered = renderReportSchemaToHtml(parsed.data, previewContext)
    setPreviewSrcDoc(
      wrapReportPreviewHtml(rendered, { screenZoom: REPORT_PRINT_PREVIEW_SCREEN_ZOOM })
    )
    setUseReactPreview(false)
  }, [previewContext, reportConfig?.reportKey, template])

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

    const ownerDoc = captureTarget.ownerDocument
    if (ownerDoc?.fonts?.ready) {
      await ownerDoc.fonts.ready
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

    const baseName = slugifyReportFileName(template?.name ?? "reporte")
    const fileName = `${baseName}-${String(templateId).slice(0, 8)}.pdf`
    const reportKey = reportConfig?.reportKey?.trim() ?? ""

    try {
      if (useReactPreview && pdfData) {
        const captureTarget = reactPreviewRef.current
        if (!captureTarget) {
          setPdfActionError(m.pdfExportFailed)
          return
        }

        await waitForCaptureReady(captureTarget)

        const orientation = reportConfig?.pdfOrientation ?? "landscape"
        const format = reportConfig?.pdfFormat ?? "a4"
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
            if (blob.size > UPLOAD_MAX_BYTES_20_MB) {
              const tooLargeMessage =
                "El PDF supera 20 MB y no se pudo guardar en el historial. El archivo local sí se descargó."
              setPdfWarning(tooLargeMessage)
              showSnackbar("warning", tooLargeMessage)
            } else {
              await uploadReportDocumentPdf({
                historyId: previewHistoryId,
                file: blob,
                fileName,
              })
              showSnackbar("success", "PDF guardado en el historial correctamente.")
            }
          } catch (err: unknown) {
            const uploadMessage = getUploadApiErrorMessage(err, {
              tooLarge:
                "El PDF es demasiado grande para guardarlo en el historial (máximo 20 MB).",
              typeMismatch:
                "El PDF generado no coincide con el tipo esperado y no se pudo guardar en el historial.",
              unsupported:
                "No se pudo guardar el PDF en el historial por un formato no soportado.",
              generic: m.pdfHistoryWarning,
            })
            setPdfWarning(uploadMessage || getApiErrorMessage(err) || m.pdfHistoryWarning)
            showSnackbar(
              "warning",
              uploadMessage || getApiErrorMessage(err) || m.pdfHistoryWarning
            )
          } finally {
            setSavingPdf(false)
          }
        }
        return
      }

      if (!supportsSchemaReportPipeline(reportKey)) {
        setPdfActionError(m.pdfExportFailed)
        showSnackbar("error", m.pdfExportFailed)
        return
      }

      const rows = coercePreviewRows(previewContext)
      if (rows.length === 0) {
        setPdfActionError(m.errorNoData)
        showSnackbar("error", m.errorNoData)
        return
      }

      await downloadReportPdfFromServer({
        reportType: reportKey,
        fileBaseName: baseName,
        templateId: templateId.trim(),
        appliedFilters: Object.fromEntries(
          Object.entries(appliedFilters).map(([key, value]) => [key, String(value ?? "")])
        ),
      })
      showSnackbar("success", "PDF generado correctamente.")
    } catch {
      setPdfActionError(m.pdfExportFailed)
      showSnackbar("error", m.pdfExportFailed)
    } finally {
      setDownloadingPdf(false)
    }
  }, [
    appliedFilters,
    m.errorNoData,
    m.pdfExportFailed,
    m.pdfHistoryWarning,
    pdfData,
    previewContext,
    previewHistoryId,
    reportConfig?.pdfFormat,
    reportConfig?.pdfOrientation,
    reportConfig?.reportKey,
    showSnackbar,
    template?.name,
    templateId,
    useReactPreview,
  ])

  const trail = template
    ? [{ label: m.breadcrumbReports, href: "/portal-rrhh/reportes" }, { label: template.name }]
    : [{ label: m.breadcrumbReports, href: "/portal-rrhh/reportes" }, { label: m.breadcrumbReport }]

  const breadcrumbLabel = template?.name ?? m.breadcrumbReport
  const busy = loadingTemplate || loadingConfig || generatingPreview
  const hasPreviewData = hasPreviewContext(previewContext)
  const schemaReady =
    !useReactPreview &&
    previewSrcDoc != null &&
    previewSrcDoc.trim() !== "" &&
    !previewSrcDoc.includes("report-template-error")
  const hasPdfCaptureSource =
    (useReactPreview && pdfData != null) ||
    (schemaReady &&
      supportsSchemaReportPipeline(reportConfig?.reportKey?.trim() ?? "") &&
      coercePreviewRows(previewContext).length > 0)
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {loadingTemplate ? (
          <div
            className="flex items-center gap-2 px-4 pt-6 font-sans text-sm text-muted-foreground md:px-8"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {m.loading}
          </div>
        ) : null}

        {!loadingTemplate && templateError ? (
          <div
            className="flex max-w-lg flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 mx-4 mt-6 md:mx-8"
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
            <section
              className="shrink-0 px-4 pt-6 md:px-8"
              aria-label={m.headerAria}
            >
              <PortalPageHeader
                className="shrink-0 gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between"
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

            <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-2 md:px-8">
            {loadingConfig ? (
              <div className="shrink-0 flex items-center gap-2 font-sans text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {m.loadingConfig}
              </div>
            ) : null}

            {configError ? (
              <p className="shrink-0 font-sans text-sm text-destructive" role="alert">
                {configError}
              </p>
            ) : null}

            {!loadingConfig && !configError && reportConfig?.filterSchema.fields.length === 0 ? (
              <p className="shrink-0 font-sans text-sm text-amber-700 dark:text-amber-400" role="status">
                {m.errorNoConfig}
              </p>
            ) : null}

            {isLegacyConfig ? (
              <p className="shrink-0 font-sans text-xs text-muted-foreground" role="note">
                {m.legacyModeHint}
              </p>
            ) : null}

            {pdfActionError ? (
              <p className="shrink-0 font-sans text-sm text-destructive" role="alert">
                {pdfActionError}
              </p>
            ) : null}

            {pdfWarning ? (
              <p
                className="shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-sans text-sm text-amber-900 dark:text-amber-100"
                role="status"
              >
                {pdfWarning}
              </p>
            ) : null}

            {!loadingConfig && !configError && reportConfig ? (
              <section className="shrink-0" aria-label={m.filtersAria} data-report-pdf-exclude>
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
              <div className="shrink-0 flex items-center gap-2 font-sans text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {m.loadingData}
              </div>
            ) : null}

            {previewError ? (
              <p className="shrink-0 font-sans text-sm text-destructive" role="alert">
                {previewError}
              </p>
            ) : null}

            {!generatingPreview && !previewError && hasPreviewData ? (
              <section aria-label={m.previewTitle} className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                {useReactPreview && pdfData ? (
                  <div
                    ref={reactPreviewRef}
                    className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border border-border bg-muted/15 p-4"
                  >
                    <div className="flex w-full justify-center">
                      <ExecutiveSummaryReportPdfTemplate
                        data={pdfData}
                        filters={pdfFilters}
                        generatedAt={formatGeneratedAtForPdf()}
                      />
                    </div>
                  </div>
                ) : previewSrcDoc ? (
                  <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/15">
                    <iframe
                      title={m.previewTitle}
                      sandbox="allow-same-origin"
                      srcDoc={previewSrcDoc}
                      className="h-full min-h-0 w-full border-0 bg-background"
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
              className="inline-flex w-fit shrink-0 items-center justify-center rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              data-html2canvas-ignore="true"
            >
              {m.backToReports}
            </Link>
            </div>
          </>
        ) : null}
      </div>
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
