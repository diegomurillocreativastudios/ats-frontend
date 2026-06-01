import type { LucideIcon } from "lucide-react"
import {
  Building2,
  ClipboardCheck,
  FileText,
  GitBranch,
  LayoutDashboard,
  Share2,
  Sparkles,
  DollarSign,
  Timer,
  Users,
} from "lucide-react"

/**
 * Builds the hub URL that opens a report by its catalog `reportKey`.
 * The dynamic `[id]` route resolves the key against the catalog and
 * delegates to the data view (or template detail for numeric ids).
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
  "time-to-hire-kpi": Timer,
  "recruiter-productivity": Users,
  "salary-expectations": DollarSign,
  summary: LayoutDashboard,
  "executive-summary": LayoutDashboard,
}

export function getReportCatalogIcon(reportKey: string): LucideIcon {
  return REPORT_CATALOG_ICONS[reportKey.trim()] ?? FileText
}
