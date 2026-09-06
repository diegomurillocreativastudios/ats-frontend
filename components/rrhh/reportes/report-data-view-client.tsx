"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AlertCircle, FileDown, Loader2, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import ReportesFiltersPlaceholder, {
  ReportesFilterControl,
} from "@/components/rrhh/reportes/reportes-filters-placeholder"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import {
  DatePicker,
  datePickerFilterButtonClass,
} from "@/components/ui/date-picker"
import { getApiErrorMessage } from "@/lib/api-error"
import { APP_LOGO_SVG_SRC } from "@/lib/app-brand"
import type {
  ReportCatalogFilter,
  ReportCatalogItem,
} from "@/lib/api/recruiter-reports-catalog"
import {
  fetchRecruiterReportForCatalogItem,
  type ReportRuntimeResponse,
} from "@/lib/api/recruiter-report-runtime"
import {
  listRecruiterCompanies,
  listRecruiterVacancies,
  type RecruiterCompanyOption,
  type RecruiterVacancyOption,
} from "@/lib/api/recruiter-reports"
import { downloadReportPdfFromServer } from "@/lib/pdf/download-report-pdf-from-server"
import { formatGeneratedAtForPdf } from "@/lib/reportes/executive-summary-metrics"
import {
  REPORT_PRINT_PREVIEW_SCREEN_ZOOM,
  wrapReportPreviewHtml,
} from "@/lib/reportes/report-preview-html"
import { resolveReportEmptyMessage } from "@/lib/reportes/report-data-registry"
import { safeParseReportSchema } from "@/lib/reportes/schema/report-schema"
import { renderReportSchemaToHtml } from "@/lib/reportes/schema/render-report-schema-to-html"
import {
  buildReportTemplateContext,
  supportsSchemaReportPipeline,
} from "@/lib/reportes/report-template-context-registry"
import {
  fetchTemplateById,
  type TemplateListItem,
} from "@/lib/templates/technical-sheet-template"

interface ReportDataViewClientProps {
  catalogItem: ReportCatalogItem
}

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

const applyButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-60 lg:w-auto lg:shrink-0"

const resetButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

const pdfButtonClass =
  "inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

const filterGridClass =
  "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] lg:items-end"

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

function resolveBrowserOrigin(): string {
  const publicBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "") || publicBase
  }
  return publicBase
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

interface ReportPreviewMeta {
  generatedAt: string
  logoUrl: string
}

type FilterValues = Record<string, string>

function defaultFiltersFor(filters: ReportCatalogFilter[]): FilterValues {
  const out: FilterValues = {}
  for (const f of filters) {
    out[f.key] = ""
  }
  return out
}

function isSelectCompanyFilter(filter: ReportCatalogFilter): boolean {
  const type = (filter.type ?? "").toLowerCase()
  return (
    type === "select-company" ||
    type === "company" ||
    filter.key === "clientId" ||
    filter.key === "companyId"
  )
}

function isSelectVacancyFilter(filter: ReportCatalogFilter): boolean {
  const type = (filter.type ?? "").toLowerCase()
  return (
    type === "select-vacancy" ||
    type === "vacancy" ||
    filter.key === "vacancyId"
  )
}

function isDateFilter(filter: ReportCatalogFilter): boolean {
  const type = (filter.type ?? "").toLowerCase()
  return type === "date" || type === "datetime"
}

function isNumberFilter(filter: ReportCatalogFilter): boolean {
  const type = (filter.type ?? "").toLowerCase()
  return (
    type === "number" ||
    filter.key === "page" ||
    filter.key === "pageSize" ||
    filter.key === "scoreMin" ||
    filter.key === "scoreMax"
  )
}

function resolveFilterPlaceholder(filter: ReportCatalogFilter): string {
  const placeholderRaw = (filter as { placeholder?: unknown }).placeholder
  if (typeof placeholderRaw === "string" && placeholderRaw.trim() !== "") {
    return placeholderRaw
  }
  return filter.label?.trim() || filter.key
}

interface FilterFieldProps {
  filter: ReportCatalogFilter
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  companies: RecruiterCompanyOption[]
  vacancies: RecruiterVacancyOption[]
  optionsLoading: boolean
}

function FilterField({
  filter,
  value,
  onChange,
  disabled,
  companies,
  vacancies,
  optionsLoading,
}: FilterFieldProps) {
  const controlId = `report-filter-${filter.key}`
  const label = filter.label?.trim() || filter.key

  if (isSelectCompanyFilter(filter)) {
    return (
      <ReportesFilterControl label={label} controlId={controlId}>
        <div className="relative">
          {optionsLoading ? (
            <Loader2
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : null}
          <select
            id={controlId}
            className={controlClass}
            value={value}
            disabled={disabled || optionsLoading}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Todos</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </ReportesFilterControl>
    )
  }

  if (isSelectVacancyFilter(filter)) {
    return (
      <ReportesFilterControl label={label} controlId={controlId}>
        <div className="relative">
          {optionsLoading ? (
            <Loader2
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : null}
          <select
            id={controlId}
            className={controlClass}
            value={value}
            disabled={disabled || optionsLoading}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Todas</option>
            {vacancies.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>
      </ReportesFilterControl>
    )
  }

  if (isDateFilter(filter)) {
    return (
      <ReportesFilterControl label={label} controlId={controlId}>
        <DatePicker
          id={controlId}
          value={value}
          disabled={disabled}
          onChange={(next) => onChange(next ?? "")}
          ariaLabel={label}
          buttonClassName={datePickerFilterButtonClass}
          wrapperClassName="relative w-full"
        />
      </ReportesFilterControl>
    )
  }

  if (isNumberFilter(filter)) {
    return (
      <ReportesFilterControl label={label} controlId={controlId}>
        <input
          id={controlId}
          type="number"
          inputMode="numeric"
          className={controlClass}
          value={value}
          placeholder={resolveFilterPlaceholder(filter)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </ReportesFilterControl>
    )
  }

  return (
    <ReportesFilterControl label={label} controlId={controlId}>
      <input
        id={controlId}
        type="text"
        className={controlClass}
        value={value}
        placeholder={resolveFilterPlaceholder(filter)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </ReportesFilterControl>
  )
}

export function ReportDataViewClient({
  catalogItem,
}: ReportDataViewClientProps) {
  const t = useTranslations("RecruiterPortal.reports.dataView")
  const tReports = useTranslations("RecruiterPortal.reports")
  const catalogFilters = useMemo(
    () => catalogItem.filters ?? [],
    [catalogItem.filters]
  )

  const [draftFilters, setDraftFilters] = useState<FilterValues>(() =>
    defaultFiltersFor(catalogFilters)
  )
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(() =>
    defaultFiltersFor(catalogFilters)
  )

  const [response, setResponse] = useState<ReportRuntimeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [companies, setCompanies] = useState<RecruiterCompanyOption[]>([])
  const [vacancies, setVacancies] = useState<RecruiterVacancyOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  const linkedTemplateId =
    catalogItem.linkedTemplate?.templateId?.trim() ?? ""
  const [template, setTemplate] = useState<TemplateListItem | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [pdfActionError, setPdfActionError] = useState<string | null>(null)

  const hasCompanyFilter = catalogFilters.some(isSelectCompanyFilter)
  const hasVacancyFilter = catalogFilters.some(isSelectVacancyFilter)

  const optionsRequest = useRef(0)
  useEffect(() => {
    if (!hasCompanyFilter && !hasVacancyFilter) {
      setOptionsLoading(false)
      return
    }
    const token = ++optionsRequest.current
    setOptionsLoading(true)
    const loaders: Array<Promise<void>> = []
    if (hasCompanyFilter) {
      loaders.push(
        listRecruiterCompanies()
          .then((list) => {
            if (token !== optionsRequest.current) return
            setCompanies(list)
          })
          .catch(() => {
            if (token !== optionsRequest.current) return
            setCompanies([])
          })
      )
    }
    if (hasVacancyFilter) {
      loaders.push(
        listRecruiterVacancies()
          .then((list) => {
            if (token !== optionsRequest.current) return
            setVacancies(list)
          })
          .catch(() => {
            if (token !== optionsRequest.current) return
            setVacancies([])
          })
      )
    }
    void Promise.allSettled(loaders).finally(() => {
      if (token !== optionsRequest.current) return
      setOptionsLoading(false)
    })
  }, [hasCompanyFilter, hasVacancyFilter])

  const requestToken = useRef(0)
  const loadData = useCallback(
    async (filters: FilterValues) => {
      const token = ++requestToken.current
      setLoading(true)
      setError(null)
      try {
        const result = await fetchRecruiterReportForCatalogItem(
          catalogItem,
          filters
        )
        if (token !== requestToken.current) return
        setResponse(result)
      } catch (err: unknown) {
        if (token !== requestToken.current) return
        const status =
          typeof err === "object" && err !== null && "status" in err
            ? Number((err as { status?: number }).status)
            : 0
        if (status === 401 || status === 403) {
          setError(t("errors.forbidden"))
        } else {
          setError(
            getApiErrorMessage(err) || t("errors.loadDataFailed")
          )
        }
        setResponse(null)
      } finally {
        if (token === requestToken.current) {
          setLoading(false)
        }
      }
    },
    [catalogItem]
  )

  useEffect(() => {
    void loadData(appliedFilters)
  }, [loadData, appliedFilters])

  useEffect(() => {
    if (!linkedTemplateId) {
      setTemplate(null)
      setTemplateError(null)
      setTemplateLoading(false)
      return
    }
    let cancelled = false
    setTemplateLoading(true)
    setTemplateError(null)
    fetchTemplateById(linkedTemplateId)
      .then((tpl) => {
        if (cancelled) return
        setTemplate(tpl)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setTemplate(null)
        setTemplateError(getApiErrorMessage(err) || t("errors.loadTemplateFailed"))
      })
      .finally(() => {
        if (cancelled) return
        setTemplateLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [linkedTemplateId])

  const handleApply = () => {
    setAppliedFilters({ ...draftFilters })
  }

  const handleReset = () => {
    const empty = defaultFiltersFor(catalogFilters)
    setDraftFilters(empty)
    setAppliedFilters(empty)
  }

  const handleRetry = () => {
    void loadData(appliedFilters)
  }

  const previewMeta = useMemo<ReportPreviewMeta>(() => {
    const origin = resolveBrowserOrigin()
    return {
      generatedAt: formatGeneratedAtForPdf(),
      logoUrl: origin ? `${origin}${APP_LOGO_SVG_SRC}` : "",
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response])

  const usesSchemaPipeline = supportsSchemaReportPipeline(catalogItem.reportKey)

  const resolvedClientName = useMemo(() => {
    const clientId = String(appliedFilters.clientId ?? appliedFilters.companyId ?? "").trim()
    if (!clientId) return "Todos"
    return companies.find((c) => c.id === clientId)?.name?.trim() || "Cliente"
  }, [appliedFilters, companies])

  const previewContext = useMemo<Record<string, unknown> | null>(() => {
    if (!response) return null
    const ctx = buildReportTemplateContext({
      reportKey: catalogItem.reportKey,
      reportName: catalogItem.name,
      reportDescription: catalogItem.description,
      rows: response.rows,
      totalCount: response.totalCount,
      appliedFilters,
      clientName: resolvedClientName,
      generatedAt: previewMeta.generatedAt,
      extras: response.extras,
    })
    return {
      ...ctx,
      meta: previewMeta,
      logoUrl: previewMeta.logoUrl,
    }
  }, [
    appliedFilters,
    catalogItem.description,
    catalogItem.name,
    catalogItem.reportKey,
    previewMeta,
    resolvedClientName,
    response,
  ])

  const parsedSchema = useMemo(() => {
    if (!usesSchemaPipeline) {
      return {
        success: false as const,
        error: "Este reporte no tiene pipeline de esquema JSON configurado.",
      }
    }
    const content = template?.contentTemplate?.trim() ?? ""
    if (!content) {
      return { success: false as const, error: t("noTemplate") }
    }
    return safeParseReportSchema(content)
  }, [template?.contentTemplate, t, usesSchemaPipeline])

  const renderedHtml = useMemo(() => {
    if (!previewContext) return null
    if (!usesSchemaPipeline) {
      return renderSchemaErrorHtml(
        "Este reporte no tiene pipeline de esquema JSON configurado."
      )
    }
    if (parsedSchema.success === false) {
      return renderSchemaErrorHtml(parsedSchema.error)
    }
    return renderReportSchemaToHtml(parsedSchema.data, previewContext)
  }, [parsedSchema, previewContext, usesSchemaPipeline])

  const previewSrcDoc = useMemo(() => {
    if (!renderedHtml) return null
    return wrapReportPreviewHtml(renderedHtml, {
      screenZoom: REPORT_PRINT_PREVIEW_SCREEN_ZOOM,
    })
  }, [renderedHtml])

  const handleDownloadPdf = useCallback(async () => {
    setPdfActionError(null)
    setDownloadingPdf(true)

    const baseName = slugifyReportFileName(catalogItem.name || catalogItem.reportKey)
    const rows = response?.rows ?? []

    if (rows.length === 0) {
      setPdfActionError(t("errors.pdfFailed"))
      setDownloadingPdf(false)
      return
    }

    try {
      await downloadReportPdfFromServer({
        reportType: catalogItem.reportKey,
        fileBaseName: baseName,
        templateId: linkedTemplateId || null,
        appliedFilters,
      })
    } catch (err: unknown) {
      console.error("[Report PDF] Download failed", err)
      setPdfActionError(
        getApiErrorMessage(err) || t("errors.pdfFailed")
      )
    } finally {
      setDownloadingPdf(false)
    }
  }, [
    appliedFilters,
    catalogItem.name,
    catalogItem.reportKey,
    linkedTemplateId,
    response?.rows,
    t,
  ])

  const canDownloadPdf =
    usesSchemaPipeline &&
    !loading &&
    !downloadingPdf &&
    (response?.rows?.length ?? 0) > 0 &&
    Boolean(linkedTemplateId || template) &&
    Boolean(parsedSchema && parsedSchema.success)

  const trail = useMemo(
    () => [
      { label: t("breadcrumb"), href: "/portal-rrhh/reportes" },
      { label: catalogItem.name },
    ],
    [catalogItem.name, t]
  )

  const totalCountLabel =
    response?.totalCount != null
      ? response.totalCount.toLocaleString("es-MX")
      : "—"

  const emptyMessage = resolveReportEmptyMessage(catalogItem.reportKey)
  const hasFilters = catalogFilters.length > 0
  const hasRows = (response?.rows?.length ?? 0) > 0

  return (
    <RrhhReportsShell breadcrumbLabel={catalogItem.name} breadcrumbTrail={trail}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <section
          className="shrink-0 px-4 pt-6 md:px-8"
          aria-label="Encabezado del reporte"
        >
          <PortalPageHeader
            className="shrink-0 gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between"
            title={catalogItem.name}
            description={
              catalogItem.description?.trim() ||
              "Datos en vivo del reporte. Ajustá filtros y aplicá para recargar."
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-sans text-xs font-medium text-muted-foreground">
                  reportKey: {catalogItem.reportKey}
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-sans text-xs font-medium text-muted-foreground">
                  {t("rows")} {totalCountLabel}
                </span>
                {usesSchemaPipeline && (linkedTemplateId || template) ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDownloadPdf()
                    }}
                    disabled={!canDownloadPdf}
                    className={pdfButtonClass}
                    aria-busy={downloadingPdf || undefined}
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    {downloadingPdf ? t("generatingPdf") : t("downloadPdf")}
                  </button>
                ) : null}
              </div>
            }
          />
        </section>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-2 md:px-8">
          {pdfActionError ? (
            <p className="shrink-0 font-sans text-sm text-destructive" role="alert">
              {pdfActionError}
            </p>
          ) : null}

          {templateError ? (
            <p
              className="shrink-0 font-sans text-sm text-amber-700 dark:text-amber-400"
              role="status"
            >
              {templateError}
            </p>
          ) : null}

          {hasFilters ? (
            <section className="shrink-0" aria-label="Filtros del reporte">
              <ReportesFiltersPlaceholder
                hintText={tReports("filters.hint")}
                controlsClassName={filterGridClass}
              >
                {catalogFilters.map((filter) => (
                  <FilterField
                    key={filter.key}
                    filter={filter}
                    value={draftFilters[filter.key] ?? ""}
                    onChange={(next) =>
                      setDraftFilters((prev) => ({ ...prev, [filter.key]: next }))
                    }
                    disabled={loading}
                    companies={companies}
                    vacancies={vacancies}
                    optionsLoading={optionsLoading}
                  />
                ))}
                <div className="flex w-full min-w-0 flex-col justify-end gap-2 sm:col-span-2 lg:col-span-1 lg:flex-row">
                  <button
                    type="button"
                    onClick={handleApply}
                    className={applyButtonClass}
                    disabled={loading}
                    aria-busy={loading || undefined}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {t("applyFilters")}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className={resetButtonClass}
                    disabled={loading}
                  >
                    {t("clear")}
                  </button>
                </div>
              </ReportesFiltersPlaceholder>
            </section>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {error ? (
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
                      {t("loadFailed")}
                    </p>
                    <p className="font-sans text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className={resetButtonClass}
                  aria-label={t("retryAria")}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  {t("retry")}
                </button>
              </div>
            ) : null}

            {loading && !response ? (
              <div
                className="flex items-center gap-2 font-sans text-sm text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("loadingData")}
              </div>
            ) : null}

            {!loading && !error && response && !hasRows ? (
              <p className="font-sans text-sm text-muted-foreground" role="status">
                {emptyMessage}
              </p>
            ) : null}

            {usesSchemaPipeline && (linkedTemplateId || template) && templateLoading ? (
              <div
                className="flex items-center gap-2 font-sans text-sm text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("loadingTemplate")}
              </div>
            ) : null}

            {previewSrcDoc ? (
              <section
                aria-label={t("previewTitle")}
                className="report-preview-wrapper flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
              >
                <h2 className="shrink-0 font-sans text-sm font-semibold text-foreground">
                  Vista previa
                </h2>
                <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/15">
                  <iframe
                    title="Vista previa del reporte"
                    sandbox="allow-same-origin"
                    srcDoc={previewSrcDoc}
                    className="h-full min-h-0 w-full border-0 bg-background"
                  />
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </RrhhReportsShell>
  )
}
