"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import ReportesFiltersPlaceholder, {
  ReportesFilterControl,
} from "@/components/rrhh/reportes/reportes-filters-placeholder"
import { ReportesQueryActions } from "@/components/rrhh/reportes/reportes-query-actions"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import { getApiErrorMessage } from "@/lib/api-error"
import {
  fetchReportsSummary,
  listRecruiterCompanies,
  type RecruiterCompanyOption,
  type ReportsRecruiterSummary,
} from "@/lib/api/recruiter-reports"
import { defaultMonthDateRange, formatPercent } from "@/lib/reportes-display"

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 font-sans text-sm text-foreground disabled:opacity-60"

const KNOWN_CARD_KEYS: {
  field: keyof ReportsRecruiterSummary
  label: string
  format: "int" | "percent" | "text"
}[] = [
  { field: "totalVacancies", label: "Vacantes", format: "int" },
  { field: "totalCandidates", label: "Candidatos", format: "int" },
  { field: "totalHires", label: "Contrataciones", format: "int" },
  { field: "hiredCount", label: "Contratados (alt.)", format: "int" },
  {
    field: "averagePreliminaryMatchScore",
    label: "Match preliminar medio",
    format: "percent",
  },
  {
    field: "technicalEvaluationsCount",
    label: "Evaluaciones técnicas",
    format: "int",
  },
  {
    field: "technicalEvaluationApprovalRate",
    label: "Tasa aprobación eval.",
    format: "percent",
  },
  { field: "approvalRate", label: "Tasa aprobación", format: "percent" },
  {
    field: "mainRecruitmentSourceKey",
    label: "Fuente principal (clave)",
    format: "text",
  },
  {
    field: "mainRecruitmentSource",
    label: "Fuente principal",
    format: "text",
  },
  { field: "mainSourceLabel", label: "Fuente (etiqueta)", format: "text" },
]

function formatSummaryValue(
  format: "int" | "percent" | "text",
  value: unknown
): string {
  if (value == null || value === "") return "—"
  if (format === "text") return String(value)
  if (format === "percent") {
    if (typeof value === "number" && !Number.isNaN(value))
      return formatPercent(value)
    const n = Number.parseFloat(String(value))
    if (!Number.isNaN(n)) return formatPercent(n)
    return "—"
  }
  if (typeof value === "number" && !Number.isNaN(value)) return String(Math.round(value))
  const n = Number.parseInt(String(value), 10)
  if (!Number.isNaN(n)) return String(n)
  return "—"
}

export default function ReporteResumenPage() {
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

  const extraEntries = useMemo(() => {
    if (!summary || typeof summary !== "object") return []
    const skip = new Set<string>(
      KNOWN_CARD_KEYS.map((k) => k.field as string)
    )
    return Object.entries(summary).filter(([key, val]) => {
      if (skip.has(key)) return false
      if (val == null || val === "") return false
      if (typeof val === "object") return false
      return true
    })
  }, [summary])

  const mainContent = (
    <div className="min-w-0 flex flex-col gap-6 pb-10">
      <section className="px-4 pt-6 md:px-8" aria-label="Encabezado del reporte">
        <PortalPageHeader
          title="Resumen de reportes"
          description="Indicadores agregados desde GET /api/recruiter/reports/summary. Las claves visibles dependen de lo que devuelva el backend."
        />
      </section>
      <section className="space-y-4 px-4 md:px-8" aria-label="Filtros y tarjetas">
        <ReportesFiltersPlaceholder>
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
            <input
              id="filtro-desde-sum"
              type="date"
              className={controlClass}
              value={draftDateFrom}
              onChange={(e) => setDraftDateFrom(e.target.value)}
            />
          </ReportesFilterControl>
          <ReportesFilterControl label="Hasta" controlId="filtro-hasta-sum">
            <input
              id="filtro-hasta-sum"
              type="date"
              className={controlClass}
              value={draftDateTo}
              onChange={(e) => setDraftDateTo(e.target.value)}
            />
          </ReportesFilterControl>
        </ReportesFiltersPlaceholder>
        <ReportesQueryActions
          statusText={loading ? "Cargando…" : error ? "" : "Datos actualizados"}
          loading={loading}
          onApply={handleApplyFilters}
        />
        {error ? (
          <div
            className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-4 font-sans text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {!loading && !error && summary ? (
          <>
            <div
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              aria-label="Indicadores del resumen"
            >
              {KNOWN_CARD_KEYS.map(({ field, label, format }) => {
                const raw = summary[field]
                const display = formatSummaryValue(format, raw)
                if (display === "—" && (raw == null || raw === "")) return null
                return (
                  <div
                    key={field}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <p className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-1 font-sans text-2xl font-semibold tabular-nums text-foreground">
                      {display}
                    </p>
                  </div>
                )
              })}
            </div>
            {extraEntries.length > 0 ? (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="mb-2 font-sans text-sm font-medium text-foreground">
                  Otros campos
                </p>
                <ul className="grid gap-2 font-mono text-xs text-muted-foreground sm:grid-cols-2">
                  {extraEntries.map(([k, v]) => (
                    <li key={k}>
                      <span className="text-foreground">{k}</span>: {String(v)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  )

  return (
    <RrhhReportsShell breadcrumbLabel="Reportes" breadcrumbTrail={trail}>
      {mainContent}
    </RrhhReportsShell>
  )
}
