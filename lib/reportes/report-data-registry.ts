import type { ReactNode } from "react"
import type { ReportRuntimeRow } from "@/lib/api/recruiter-report-runtime"

/**
 * Declarative column descriptor for a recruiter report table.
 *
 * Each column references a key on the raw row payload returned by
 * `GET /api/recruiter/reports/<reportKey>`. The optional `format` hook lets
 * callers render dates, percentages or nested objects without forcing the
 * underlying row interface to be tied to a specific UI representation.
 */
export interface ReportColumn {
  key: string
  header: string
  align?: "left" | "right" | "center"
  format?: (value: unknown, row: ReportRuntimeRow) => ReactNode
  /** Short helper text shown as a column hint when present. */
  hint?: string
}

export interface ReportColumnConfig {
  columns: ReportColumn[]
  /**
   * Optional human-friendly empty-state copy when the endpoint returns
   * zero rows for the current filters.
   */
  emptyMessage?: string
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

function formatDate(value: unknown): string {
  if (value == null || value === "") return "—"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "—"
  return DATE_FORMATTER.format(date)
}

function formatDateTime(value: unknown): string {
  if (value == null || value === "") return "—"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "—"
  return DATE_TIME_FORMATTER.format(date)
}

function formatPercent(value: unknown): string {
  if (value == null || value === "") return "—"
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return `${n.toFixed(1)}%`
}

function formatScore(value: unknown): string {
  if (value == null || value === "") return "—"
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return n.toFixed(1)
}

function formatInteger(value: unknown): string {
  if (value == null || value === "") return "—"
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString("es-MX")
}

function formatNullableInteger(value: unknown): string {
  return formatInteger(value)
}

export const REPORT_DATA_REGISTRY: Record<string, ReportColumnConfig> = {
  "vacancy-progress-by-client": {
    columns: [
      { key: "clientName", header: "Cliente" },
      { key: "vacancyTitle", header: "Vacante" },
      { key: "vacancyStatus", header: "Estatus" },
      {
        key: "openedAt",
        header: "Apertura",
        format: (v) => formatDate(v),
      },
      {
        key: "closedAt",
        header: "Cierre",
        format: (v) => formatDate(v),
      },
      {
        key: "totalCandidates",
        header: "Candidatos",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "candidatesInInterview",
        header: "En entrevista",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "candidatesFinalist",
        header: "Finalistas",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "candidatesHired",
        header: "Contratados",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "averageDaysToFill",
        header: "Días promedio para cierre",
        align: "right",
        format: (v) => formatNullableInteger(v),
      },
      {
        key: "progressPercent",
        header: "% Avance",
        align: "right",
        format: (v) => formatPercent(v),
      },
      {
        key: "averagePreliminaryMatchScore",
        header: "Score IA prom.",
        align: "right",
        format: (v) => formatScore(v),
      },
      {
        key: "candidatesWithPreliminaryAnalysis",
        header: "Con análisis IA",
        align: "right",
        format: (v) => formatInteger(v),
      },
    ],
    emptyMessage:
      "No hay vacantes que coincidan con los filtros seleccionados.",
  },
  "candidate-status-by-stage": {
    columns: [
      { key: "candidateName", header: "Candidato" },
      { key: "vacancyTitle", header: "Vacante" },
      { key: "clientName", header: "Cliente" },
      {
        key: "currentStageName",
        header: "Etapa actual",
        format: (v, row) => String(v ?? row.stageName ?? "—"),
      },
      { key: "applicationStatus", header: "Estado" },
      {
        key: "daysInStage",
        header: "Días en etapa",
        align: "right",
        format: (v) => formatNullableInteger(v),
      },
      {
        key: "lastMovedAt",
        header: "Último movimiento",
        format: (v) => formatDateTime(v),
      },
    ],
    emptyMessage:
      "No hay candidatos que coincidan con los filtros seleccionados.",
  },
  "technical-evaluations": {
    columns: [
      { key: "candidateName", header: "Candidato" },
      { key: "vacancyTitle", header: "Vacante" },
      {
        key: "evaluationTitle",
        header: "Evaluación",
        format: (v, row) => String(v ?? row.testName ?? "—"),
      },
      { key: "scoreOrOutcome", header: "Resultado" },
      { key: "outcome", header: "Estatus" },
      {
        key: "evaluatedAt",
        header: "Evaluado",
        format: (v) => formatDate(v),
      },
      { key: "evaluatorName", header: "Evaluador" },
    ],
    emptyMessage:
      "No hay evaluaciones técnicas para los filtros seleccionados.",
  },
  "recruitment-sources": {
    columns: [
      {
        key: "sourceLabel",
        header: "Fuente",
        format: (v, row) =>
          String(v ?? row.applicationSource ?? row.sourceKey ?? "—"),
      },
      {
        key: "candidatesCount",
        header: "Candidatos",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "interviewedCount",
        header: "Entrevistados",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "finalistsCount",
        header: "Finalistas",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "hiresCount",
        header: "Contratados",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "conversionPercent",
        header: "% Conversión",
        align: "right",
        format: (v) => formatPercent(v),
      },
    ],
    emptyMessage:
      "No hay datos de fuentes para el rango seleccionado.",
  },
  "time-to-hire-kpi": {
    columns: [
      { key: "clientName", header: "Cliente" },
      { key: "vacancyTitle", header: "Vacante" },
      { key: "vacancyStatus", header: "Estatus" },
      {
        key: "openedAt",
        header: "Apertura",
        format: (v) => formatDate(v),
      },
      {
        key: "firstHireAt",
        header: "Primera contratación",
        format: (v) => formatDate(v),
      },
      {
        key: "timeToFillDays",
        header: "TTF (días)",
        align: "right",
        format: (v) => formatNullableInteger(v),
      },
      {
        key: "timeToHireDays",
        header: "TTH (días)",
        align: "right",
        format: (v) => formatNullableInteger(v),
      },
      {
        key: "daysOpen",
        header: "Días abierta",
        align: "right",
        format: (v) => formatNullableInteger(v),
      },
      {
        key: "isSlaBreached",
        header: "SLA roto",
        align: "center",
        format: (v) => {
          if (v === true) return "Sí"
          if (v === false) return "No"
          return "—"
        },
      },
      {
        key: "totalCandidates",
        header: "Candidatos",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "candidatesHired",
        header: "Contratados",
        align: "right",
        format: (v) => formatInteger(v),
      },
    ],
    emptyMessage:
      "No hay datos de time-to-hire para los filtros seleccionados.",
  },
  "salary-expectations": {
    columns: [
      { key: "candidateName", header: "Candidato" },
      { key: "vacancyTitle", header: "Vacante" },
      { key: "clientName", header: "Cliente" },
      {
        key: "currentStageName",
        header: "Etapa",
        format: (v) => String(v ?? "—"),
      },
      { key: "pipelineStatus", header: "Estado" },
      {
        key: "expectedSalaryUsd",
        header: "Pretensión (USD)",
        align: "right",
        format: (v) => {
          if (v == null || v === "") return "—"
          const n = Number(v)
          if (!Number.isFinite(n)) return "—"
          return n.toLocaleString("es-MX", { maximumFractionDigits: 0 })
        },
      },
      {
        key: "vacancyMinSalaryUsd",
        header: "Rango mín. (USD)",
        align: "right",
        format: (v) => {
          if (v == null || v === "") return "—"
          const n = Number(v)
          if (!Number.isFinite(n)) return "—"
          return n.toLocaleString("es-MX", { maximumFractionDigits: 0 })
        },
      },
      {
        key: "vacancyMaxSalaryUsd",
        header: "Rango máx. (USD)",
        align: "right",
        format: (v) => {
          if (v == null || v === "") return "—"
          const n = Number(v)
          if (!Number.isFinite(n)) return "—"
          return n.toLocaleString("es-MX", { maximumFractionDigits: 0 })
        },
      },
      {
        key: "withinRange",
        header: "En rango",
        align: "center",
        format: (v) => {
          if (v === true) return "Sí"
          if (v === false) return "No"
          return "—"
        },
      },
      {
        key: "gapAmountUsd",
        header: "Brecha (USD)",
        align: "right",
        format: (v) => {
          if (v == null || v === "") return "—"
          const n = Number(v)
          if (!Number.isFinite(n)) return "—"
          if (n === 0) return "0"
          const sign = n > 0 ? "+" : "-"
          return `${sign}${Math.abs(n).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
        },
      },
      {
        key: "appliedAt",
        header: "Aplicado",
        format: (v) => formatDate(v),
      },
    ],
    emptyMessage:
      "No hay aplicaciones con pretensión salarial para los filtros seleccionados.",
  },
  "recruiter-productivity": {
    columns: [
      { key: "displayName", header: "Reclutador" },
      { key: "email", header: "Correo" },
      {
        key: "isAdmin",
        header: "Rol",
        format: (_v, row) => {
          const r = row as { isAdmin?: boolean; isRecruiter?: boolean }
          if (r.isAdmin && r.isRecruiter) return "Admin / Reclutador"
          if (r.isAdmin) return "Admin"
          if (r.isRecruiter) return "Reclutador"
          return "—"
        },
      },
      {
        key: "applicationsManaged",
        header: "Aplicaciones",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "openVacancies",
        header: "Vacantes abiertas",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "interviewsScheduled",
        header: "Entrevistas prog.",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "interviewsCompleted",
        header: "Entrevistas compl.",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "stageMoves",
        header: "Mov. de etapa",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "hires",
        header: "Contrataciones",
        align: "right",
        format: (v) => formatInteger(v),
      },
      {
        key: "conversionPercent",
        header: "% Conversión",
        align: "right",
        format: (v) => formatPercent(v),
      },
      {
        key: "averageTimeToHireDays",
        header: "TTH prom. (días)",
        align: "right",
        format: (v) => formatNullableInteger(v),
      },
      {
        key: "averagePreliminaryMatchScore",
        header: "Score IA prom.",
        align: "right",
        format: (v) => formatScore(v),
      },
    ],
    emptyMessage:
      "No hay reclutadores que coincidan con los filtros seleccionados.",
  },
  "preliminary-match-scores": {
    columns: [
      {
        key: "candidateName",
        header: "Candidato",
        format: (v, row) =>
          String(v ?? row.candidateFullName ?? row.candidateEmail ?? "—"),
      },
      { key: "vacancyTitle", header: "Vacante" },
      { key: "clientName", header: "Cliente" },
      {
        key: "stageName",
        header: "Etapa",
        format: (v, row) => String(v ?? row.currentStageName ?? "—"),
      },
      {
        key: "score",
        header: "Score IA",
        align: "right",
        format: (v, row) => formatScore(v ?? row.preliminaryMatchScore),
      },
      {
        key: "matchLevel",
        header: "Nivel",
        format: (v, row) => String(v ?? row.level ?? "—"),
      },
      {
        key: "analyzedAt",
        header: "Analizado",
        format: (v, row) =>
          formatDate(v ?? row.evaluatedAt ?? row.createdAt),
      },
    ],
    emptyMessage:
      "No hay scores preliminares para los filtros seleccionados.",
  },
}

const HUMAN_HEADER_REPLACEMENTS: Record<string, string> = {
  id: "ID",
  guid: "ID",
  uuid: "ID",
}

function humanizeKey(key: string): string {
  if (HUMAN_HEADER_REPLACEMENTS[key.toLowerCase()]) {
    return HUMAN_HEADER_REPLACEMENTS[key.toLowerCase()]
  }
  const withSpaces = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
  if (!withSpaces) return key
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

function inferColumnFormat(
  value: unknown
): ReportColumn["format"] | undefined {
  if (value == null) return undefined
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      return (v) => formatDateTime(v)
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return (v) => formatDate(v)
    }
  }
  return undefined
}

/**
 * Resolves the column descriptors for a given `reportKey`. Falls back to
 * deriving columns from the first row when the report is unknown to the
 * registry, so newly published catalog entries still get a usable table.
 */
export function resolveReportColumns(
  reportKey: string,
  sampleRow?: ReportRuntimeRow
): ReportColumn[] {
  const cfg = REPORT_DATA_REGISTRY[reportKey.trim()]
  if (cfg) return cfg.columns
  if (!sampleRow) return []
  return Object.entries(sampleRow)
    .filter(([, value]) => typeof value !== "object" || value == null)
    .map(([key, value]) => ({
      key,
      header: humanizeKey(key),
      align:
        typeof value === "number" || typeof value === "bigint"
          ? "right"
          : undefined,
      format: inferColumnFormat(value),
    }))
}

export function resolveReportEmptyMessage(reportKey: string): string {
  return (
    REPORT_DATA_REGISTRY[reportKey.trim()]?.emptyMessage ??
    "El endpoint no devolvió filas para los filtros aplicados."
  )
}

export function getValueAtKey(
  row: ReportRuntimeRow,
  key: string
): unknown {
  if (key in row) return row[key]
  return undefined
}
