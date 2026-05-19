"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import ReportesFiltersPlaceholder, {
  ReportesFilterControl,
} from "@/components/rrhh/reportes/reportes-filters-placeholder"
import {
  ReporteResumenDashboard,
  ReporteResumenDashboardSkeleton,
  ReporteResumenErrorState,
} from "@/components/rrhh/reportes/reporte-resumen-dashboard"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { DatePicker, datePickerFilterButtonClass } from "@/components/ui/date-picker"
import { DownloadPdfButton } from "@/components/common/download-pdf-button"
import { ExecutiveSummaryReportPdfTemplate } from "@/components/recruiter/reports/executive-summary-report-pdf-template"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  formatGeneratedAtForPdf,
  formatIsoDateForPdf,
  mapSummaryToExecutiveReportPdfData,
} from "@/lib/reportes/executive-summary-metrics"
import {
  fetchReportsSummary,
  listRecruiterCompanies,
  type RecruiterCompanyOption,
  type ReportsRecruiterSummary,
} from "@/lib/api/recruiter-reports"
import { defaultMonthDateRange } from "@/lib/reportes-display"

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

const applyButtonClass =
  "inline-flex w-full items-center justify-center rounded-md bg-vo-purple px-5 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:opacity-60 lg:w-auto lg:shrink-0"

const filterGridClass =
  "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"

const pdfDownloadButtonClass =
  "inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

export default function ReporteResumenPage() {
  const pdfRef = useRef<HTMLElement | null>(null)
  const trail = [
    { label: "Reportes", href: "/portal-rrhh/reportes" },
    { label: "Resumen" },
  ]

  const initialRange = defaultMonthDateRange()

  const [companies, setCompanies] = useState<RecruiterCompanyOption[]>([])
  const [draftClientId, setDraftClientId] = useState("")
  const [draftDateFrom, setDraftDateFrom] = useState(initialRange.dateFrom)
  const [draftDateTo, setDraftDateTo] = useState(initialRange.dateTo)

  const [appliedClientId, setAppliedClientId] = useState("")
  const [appliedDateFrom, setAppliedDateFrom] = useState(initialRange.dateFrom)
  const [appliedDateTo, setAppliedDateTo] = useState(initialRange.dateTo)

  const [summary, setSummary] = useState<ReportsRecruiterSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCompanies = useCallback(async () => {
    try {
      setCompanies(await listRecruiterCompanies())
    } catch {
      setCompanies([])
    }
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReportsSummary({
        clientId: appliedClientId || undefined,
        dateFrom: appliedDateFrom || undefined,
        dateTo: appliedDateTo || undefined,
      })
      setSummary(data)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err) || "No se pudo cargar el resumen.")
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [appliedClientId, appliedDateFrom, appliedDateTo])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const handleApplyFilters = () => {
    setAppliedClientId(draftClientId)
    setAppliedDateFrom(draftDateFrom)
    setAppliedDateTo(draftDateTo)
  }

  const statusText = loading ? "Cargando indicadores…" : error ? "" : "Datos actualizados"

  const pdfFilters = useMemo(() => {
    const clientName = appliedClientId
      ? companies.find((c) => c.id === appliedClientId)?.name?.trim() || "Cliente"
      : "Todos"
    return {
      clientName,
      from: formatIsoDateForPdf(appliedDateFrom),
      to: formatIsoDateForPdf(appliedDateTo),
    }
  }, [appliedClientId, appliedDateFrom, appliedDateTo, companies])

  const pdfData = useMemo(
    () => (summary ? mapSummaryToExecutiveReportPdfData(summary) : null),
    [summary]
  )

  const mainContent = (
    <div className="min-w-0 flex flex-col gap-6 pb-10">
      <section className="px-4 pt-6 md:px-8" aria-label="Encabezado del reporte">
        <PortalPageHeader
          title="Resumen ejecutivo de reportes"
          description="Vista general del estado de clientes, vacantes, candidatos, entrevistas, evaluaciones y fuentes de reclutamiento."
          actions={
            <DownloadPdfButton
              targetRef={pdfRef}
              fileName="reporte-resumen-ejecutivo.pdf"
              label="Descargar PDF"
              disabled={loading || !summary}
              orientation="landscape"
              format="a4"
              scale={2}
              marginMm={5}
              className={pdfDownloadButtonClass}
            />
          }
        />
      </section>
      <section className="space-y-4 px-4 md:px-8" aria-label="Filtros y panel ejecutivo">
        <ReportesFiltersPlaceholder
          hintText="Filtra los indicadores por cliente y rango de fechas."
          controlsClassName={filterGridClass}
        >
          <ReportesFilterControl label="Cliente" controlId="filtro-cliente-sum">
            <select
              id="filtro-cliente-sum"
              className={controlClass}
              value={draftClientId}
              onChange={(e) => setDraftClientId(e.target.value)}
            >
              <option value="">Todos</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </ReportesFilterControl>
          <ReportesFilterControl label="Desde" controlId="filtro-desde-sum">
            <DatePicker
              id="filtro-desde-sum"
              value={draftDateFrom}
              onChange={setDraftDateFrom}
              ariaLabel="Desde"
              buttonClassName={datePickerFilterButtonClass}
              wrapperClassName="relative w-full"
            />
          </ReportesFilterControl>
          <ReportesFilterControl label="Hasta" controlId="filtro-hasta-sum">
            <DatePicker
              id="filtro-hasta-sum"
              value={draftDateTo}
              onChange={setDraftDateTo}
              ariaLabel="Hasta"
              buttonClassName={datePickerFilterButtonClass}
              wrapperClassName="relative w-full"
            />
          </ReportesFilterControl>
          <div className="flex w-full min-w-0 flex-col justify-end gap-1 sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={handleApplyFilters}
              className={applyButtonClass}
              disabled={loading}
            >
              Aplicar filtros
            </button>
          </div>
        </ReportesFiltersPlaceholder>
        <p
          className="font-sans text-xs text-muted-foreground"
          aria-live="polite"
          data-report-pdf-exclude
        >
          {statusText}
        </p>
        {error ? <ReporteResumenErrorState message={error} /> : null}
        {loading ? <ReporteResumenDashboardSkeleton /> : null}
        {!loading && !error && summary ? (
          <ReporteResumenDashboard summary={summary} />
        ) : null}
      </section>
    </div>
  )

  return (
    <RrhhReportsShell breadcrumbLabel="Reportes" breadcrumbTrail={trail}>
      {mainContent}
      {pdfData && !loading && !error ? (
        <div className="fixed left-[-10000px] top-0 z-[-1]" aria-hidden>
          <ExecutiveSummaryReportPdfTemplate
            ref={pdfRef}
            data={pdfData}
            filters={pdfFilters}
            generatedAt={formatGeneratedAtForPdf()}
          />
        </div>
      ) : null}
    </RrhhReportsShell>
  )
}
