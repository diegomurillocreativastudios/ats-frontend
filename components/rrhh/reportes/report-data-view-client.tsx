"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { AlertCircle, FileDown, Loader2, RefreshCw } from "lucide-react"
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
import type {
  ReportCatalogFilter,
  ReportCatalogItem,
} from "@/lib/api/recruiter-reports-catalog"
import {
  fetchRecruiterReportForCatalogItem,
  type ReportRuntimeResponse,
  type ReportRuntimeRow,
} from "@/lib/api/recruiter-report-runtime"
import {
  listRecruiterCompanies,
  listRecruiterVacancies,
  type RecruiterCompanyOption,
  type RecruiterVacancyOption,
} from "@/lib/api/recruiter-reports"
import { captureElementAsPdfBlob } from "@/lib/pdf/download-element-as-pdf"
import { downloadVacancyProgressReportPdf } from "@/lib/pdf/download-vacancy-progress-report-pdf"
import {
  resolveReportPdfCaptureElement,
  resolveReportPreviewPdfElement,
} from "@/lib/pdf/resolve-report-preview-pdf-element"
import { formatGeneratedAtForPdf } from "@/lib/reportes/executive-summary-metrics"
import {
  REPORT_PRINT_PREVIEW_SCREEN_ZOOM,
  wrapReportPreviewHtml,
} from "@/lib/reportes/report-preview-html"
import { resolveReportEmptyMessage } from "@/lib/reportes/report-data-registry"
import { VACANCY_PROGRESS_REPORT_DEFAULT_TEMPLATE } from "@/lib/reportes/vacancy-progress-report-default-template"
import {
  buildVacancyProgressReportTemplateContext,
  isVacancyProgressReportKey,
  resolveVacancyProgressPeriodLabel,
} from "@/lib/reportes/vacancy-progress-report-template-context"
import { renderTechnicalSheetHtml } from "@/lib/technical-sheet/template-interpolate"
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

interface ShadowHtmlCaptureHostProps {
  html: string
  wrapperClassName: string
}

/**
 * Off-screen capture target for html2canvas-based report PDFs.
 *
 * The injected report HTML embeds a `<style>` block with **global** selectors
 * (`*`, `html`, `body`, …). Rendering that HTML with `dangerouslySetInnerHTML`
 * directly into the main document would leak those rules into the host page —
 * dropping `html { font-size }` to `9.5pt` and shrinking every `rem`-based
 * Tailwind size to ~79% (the “page looks zoomed at 90%” bug).
 *
 * Mounting the HTML inside a closed Shadow DOM fully isolates the template's
 * styles while keeping a real DOM tree that html2canvas (v1.4+) can traverse.
 * The forwarded ref still resolves to the host element so existing helpers
 * such as `resolveReportPdfCaptureElement` keep working.
 */
const ShadowHtmlCaptureHost = forwardRef<HTMLDivElement, ShadowHtmlCaptureHostProps>(
  function ShadowHtmlCaptureHost({ html, wrapperClassName }, forwardedRef) {
    const hostRef = useRef<HTMLDivElement | null>(null)
    const shadowRef = useRef<ShadowRoot | null>(null)

    useImperativeHandle(forwardedRef, () => hostRef.current as HTMLDivElement)

    useEffect(() => {
      const host = hostRef.current
      if (!host) return
      if (!shadowRef.current) {
        shadowRef.current = host.attachShadow({ mode: "open" })
      }
      const root = shadowRef.current
      root.innerHTML = ""
      const wrapper = document.createElement("div")
      wrapper.className = wrapperClassName
      wrapper.style.fontFamily = "Arial, Helvetica, sans-serif"
      wrapper.innerHTML = html
      root.appendChild(wrapper)
    }, [html, wrapperClassName])

    return (
      <div
        ref={hostRef}
        className="pointer-events-none fixed top-0 left-0 z-[-1] overflow-visible bg-white opacity-[0.01]"
        aria-hidden
      />
    )
  }
)

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
  const pdfCaptureRef = useRef<HTMLDivElement>(null)
  const previewPanelRef = useRef<HTMLDivElement>(null)

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
          setError("No tenés permisos para consultar este reporte.")
        } else {
          setError(
            getApiErrorMessage(err) || "No se pudieron cargar los datos del reporte."
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
        setTemplateError(getApiErrorMessage(err) || "No se pudo cargar la plantilla del reporte.")
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
      logoUrl: origin ? `${origin}/visible-icon.png` : "",
    }
  }, [response])

  const previewContext = useMemo<Record<string, unknown> | null>(() => {
    if (!response) return null
    const clientId = String(appliedFilters.clientId ?? "").trim()
    const clientName =
      clientId === ""
        ? "Todos"
        : companies.find((c) => c.id === clientId)?.name?.trim() || "Cliente"
    const dateFrom = String(appliedFilters.dateFrom ?? "")
    const dateTo = String(appliedFilters.dateTo ?? "")
    const period = resolveVacancyProgressPeriodLabel(dateFrom, dateTo)
    const base: Record<string, unknown> = {
      report: {
        name: catalogItem.name,
        reportKey: catalogItem.reportKey,
        description: catalogItem.description ?? "",
      },
      filters: { ...appliedFilters, clientName },
      rows: response.rows,
      totalCount: response.totalCount,
      rowCount: response.totalCount,
      meta: previewMeta,
      logoUrl: previewMeta.logoUrl,
      generatedAt: previewMeta.generatedAt,
      clientName,
      dateFrom,
      dateTo,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    }
    if (!isVacancyProgressReportKey(catalogItem.reportKey)) return base
    return {
      ...base,
      ...buildVacancyProgressReportTemplateContext({
        rows: response.rows,
        totalCount: response.totalCount,
        generatedAt: previewMeta.generatedAt,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        clientName,
      }),
    }
  }, [
    appliedFilters,
    catalogItem.description,
    catalogItem.name,
    catalogItem.reportKey,
    companies,
    previewMeta,
    response,
  ])

  const reportTemplateHtml = useMemo(() => {
    const fromDb = template?.contentTemplate?.trim() ?? ""
    if (fromDb) return fromDb
    if (isVacancyProgressReportKey(catalogItem.reportKey)) {
      return VACANCY_PROGRESS_REPORT_DEFAULT_TEMPLATE
    }
    return ""
  }, [template?.contentTemplate, catalogItem.reportKey])

  const renderedHtml = useMemo(() => {
    if (!reportTemplateHtml || !previewContext) return null
    return renderTechnicalSheetHtml(reportTemplateHtml, previewContext)
  }, [reportTemplateHtml, previewContext])

  const previewSrcDoc = useMemo(() => {
    if (!renderedHtml) return null
    const screenZoom = isVacancyProgressReportKey(catalogItem.reportKey)
      ? REPORT_PRINT_PREVIEW_SCREEN_ZOOM
      : undefined
    return wrapReportPreviewHtml(renderedHtml, { screenZoom })
  }, [catalogItem.reportKey, renderedHtml])

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

  const resolvePdfCaptureTarget = useCallback((): HTMLElement | null => {
    const fromPreview = previewPanelRef.current
      ? resolveReportPreviewPdfElement(previewPanelRef.current)
      : null
    if (fromPreview) return fromPreview
    return resolveReportPdfCaptureElement(pdfCaptureRef.current)
  }, [])

  const handleDownloadPdf = useCallback(async () => {
    setPdfActionError(null)
    setDownloadingPdf(true)
    const baseName = slugifyReportFileName(catalogItem.name || catalogItem.reportKey)
    const fileName = `${baseName}.pdf`
    try {
      if (isVacancyProgressReportKey(catalogItem.reportKey)) {
        const html = renderedHtml?.trim() ?? ""
        if (html === "") {
          setPdfActionError(
            "No se encontró el contenido del reporte. Esperá a que cargue e intentá de nuevo."
          )
          return
        }
        await downloadVacancyProgressReportPdf({
          previewHtml: html,
          fileBaseName: baseName,
        })
        return
      }

      const captureTarget = resolvePdfCaptureTarget()
      if (!captureTarget) {
        setPdfActionError(
          "No se encontró la vista previa del reporte. Esperá a que cargue e intentá de nuevo."
        )
        return
      }
      await waitForCaptureReady(captureTarget)
      const blob = await captureElementAsPdfBlob({
        element: captureTarget,
        orientation: "landscape",
        format: "a4",
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
    } catch (err: unknown) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[report-pdf]", err)
      }
      setPdfActionError("No se pudo generar el PDF. Intentá de nuevo.")
    } finally {
      setDownloadingPdf(false)
    }
  }, [
    catalogItem.name,
    catalogItem.reportKey,
    renderedHtml,
    resolvePdfCaptureTarget,
  ])

  const hasPreviewSource =
    !!renderedHtml && renderedHtml.trim() !== "" && !!previewContext
  const hasTemplateSource =
    !!reportTemplateHtml ||
    (isVacancyProgressReportKey(catalogItem.reportKey) && !!response?.rows?.length)
  const canDownloadPdf =
    hasPreviewSource &&
    hasTemplateSource &&
    !loading &&
    !templateLoading &&
    !downloadingPdf &&
    (response?.rows?.length ?? 0) > 0

  const trail = useMemo(
    () => [
      { label: "Reportes", href: "/portal-rrhh/reportes" },
      { label: catalogItem.name },
    ],
    [catalogItem.name]
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
      <div className="min-w-0 flex flex-col gap-6 px-4 py-6 pb-10 md:px-8">
        <section aria-label="Encabezado del reporte">
          <PortalPageHeader
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
                  Filas: {totalCountLabel}
                </span>
                {linkedTemplateId || isVacancyProgressReportKey(catalogItem.reportKey) ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDownloadPdf()
                    }}
                    disabled={!canDownloadPdf}
                    data-html2canvas-ignore="true"
                    className={pdfButtonClass}
                    aria-busy={downloadingPdf || undefined}
                  >
                    {downloadingPdf ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    {downloadingPdf ? "Generando PDF…" : "Descargar PDF"}
                  </button>
                ) : null}
              </div>
            }
          />
        </section>

        {pdfActionError ? (
          <p className="font-sans text-sm text-destructive" role="alert">
            {pdfActionError}
          </p>
        ) : null}

        {templateError ? (
          <p className="font-sans text-sm text-amber-700 dark:text-amber-400" role="status">
            {templateError}
          </p>
        ) : null}

        {hasFilters ? (
          <section aria-label="Filtros del reporte">
            <ReportesFiltersPlaceholder
              hintText="Los valores se envían como query params al endpoint del reporte."
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
                  Aplicar filtros
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className={resetButtonClass}
                  disabled={loading}
                >
                  Limpiar
                </button>
              </div>
            </ReportesFiltersPlaceholder>
          </section>
        ) : null}

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
                  No se pudo cargar el reporte
                </p>
                <p className="font-sans text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className={resetButtonClass}
              aria-label="Reintentar carga del reporte"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reintentar
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
            Cargando datos…
          </div>
        ) : null}

        {!loading && !error && response && !hasRows ? (
          <p className="font-sans text-sm text-muted-foreground" role="status">
            {emptyMessage}
          </p>
        ) : null}

        {(linkedTemplateId || isVacancyProgressReportKey(catalogItem.reportKey)) &&
        templateLoading ? (
          <div
            className="flex items-center gap-2 font-sans text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Cargando plantilla del reporte…
          </div>
        ) : null}

        {previewSrcDoc ? (
          <section
            aria-label="Vista previa del reporte"
            className="flex min-h-0 flex-col gap-3"
          >
            <h2 className="font-sans text-sm font-semibold text-foreground">
              Vista previa
            </h2>
            <div
              ref={previewPanelRef}
              className="flex min-h-[480px] w-full flex-col overflow-hidden rounded-lg border border-border bg-muted/15"
            >
              <iframe
                title="Vista previa del reporte"
                sandbox="allow-same-origin"
                srcDoc={previewSrcDoc}
                className="min-h-[480px] w-full flex-1 border-0 bg-white"
              />
            </div>
          </section>
        ) : null}
      </div>

      {renderedHtml && !isVacancyProgressReportKey(catalogItem.reportKey) ? (
        <ShadowHtmlCaptureHost
          ref={pdfCaptureRef}
          html={renderedHtml}
          wrapperClassName="report-preview-doc w-[1600px] bg-white px-8 py-7 text-slate-950"
        />
      ) : null}
    </RrhhReportsShell>
  )
}
