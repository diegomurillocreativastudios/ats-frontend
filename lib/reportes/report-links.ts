import type { LucideIcon } from "lucide-react"
import {
  Building2,
  ClipboardCheck,
  FileText,
  GitBranch,
  LayoutDashboard,
  Share2,
  Sparkles,
} from "lucide-react"

export interface ReportHubLinkItem {
  href: string
  title: string
  description: string
  Icon: LucideIcon
  badgeLabel: string
}

/** Legacy/demo reports shown until all views are backed by admin templates. */
export const REPORT_LINKS: readonly ReportHubLinkItem[] = [
  {
    href: "/portal-rrhh/reportes/resumen",
    title: "Resumen",
    description:
      "Totales y ratios agregados (vacantes, match preliminar, evaluaciones, fuente principal) en una sola vista.",
    Icon: LayoutDashboard,
    badgeLabel: "Resumen",
  },
  {
    href: "/portal-rrhh/reportes/avance-vacantes-por-cliente",
    title: "Avance vacantes por cliente",
    description:
      "KPIs, semáforo, gráfico por cliente y tabla: control de procesos activos y atrasados.",
    Icon: Building2,
    badgeLabel: "Paso 1 · Demo",
  },
  {
    href: "/portal-rrhh/reportes/estatus-candidatos-por-etapa",
    title: "Estatus candidatos por etapa",
    description:
      "Embudo visual, distribución y alertas por estancamiento en el pipeline.",
    Icon: GitBranch,
    badgeLabel: "Paso 2 · Demo",
  },
  {
    href: "/portal-rrhh/reportes/evaluaciones-tecnicas",
    title: "Evaluaciones técnicas",
    description:
      "Indicadores, ranking por puntaje, distribución por resultado y exportación CSV.",
    Icon: ClipboardCheck,
    badgeLabel: "Paso 3 · Demo",
  },
  {
    href: "/portal-rrhh/reportes/preliminary-match-scores",
    title: "Scores matching preliminar",
    description:
      "Detalle por candidato: score 0–100, nivel, estado y fechas del análisis preliminar.",
    Icon: Sparkles,
    badgeLabel: "Paso 4 · Demo",
  },
  {
    href: "/portal-rrhh/reportes/fuentes-reclutamiento",
    title: "Fuentes de reclutamiento",
    description:
      "Pastel por volumen, barras por contrataciones y conversión por canal.",
    Icon: Share2,
    badgeLabel: "Paso 5 · Demo",
  },
] as const

export function buildReportTemplateHubHref(templateId: string | number): string {
  return `/portal-rrhh/reportes/${encodeURIComponent(String(templateId))}`
}

/**
 * Builds the hub URL that opens a report by its catalog `reportKey`.
 * The dynamic `[reportKey]` route resolves the key against the catalog and
 * delegates to the template detail view when a linked template exists.
 */
export function buildReportKeyHubHref(reportKey: string | number): string {
  return `/portal-rrhh/reportes/${encodeURIComponent(String(reportKey))}`
}

/**
 * Icon map for catalog reports keyed by `reportKey`. Falls back to a neutral
 * document icon for unknown keys so the catalog stays renderable even when the
 * backend introduces new entries.
 */
const REPORT_CATALOG_ICONS: Record<string, LucideIcon> = {
  "vacancy-progress-by-client": Building2,
  "candidate-status-by-stage": GitBranch,
  "technical-evaluations": ClipboardCheck,
  "preliminary-match-scores": Sparkles,
  "recruitment-sources": Share2,
  summary: LayoutDashboard,
  "executive-summary": LayoutDashboard,
}

export function getReportCatalogIcon(reportKey: string): LucideIcon {
  return REPORT_CATALOG_ICONS[reportKey.trim()] ?? FileText
}
