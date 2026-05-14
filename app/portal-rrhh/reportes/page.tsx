"use client"

import Link from "next/link"
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  GitBranch,
  LayoutDashboard,
  Share2,
  Sparkles,
} from "lucide-react"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import PortalPageHeader from "@/components/ui/PortalPageHeader"

const REPORT_LINKS = [
  {
    href: "/portal-rrhh/reportes/resumen",
    title: "Resumen",
    description:
      "Totales y ratios agregados (vacantes, match preliminar, evaluaciones, fuente principal) en una sola vista.",
    Icon: LayoutDashboard,
    demoOrder: 0,
  },
  {
    href: "/portal-rrhh/reportes/avance-vacantes-por-cliente",
    title: "Avance vacantes por cliente",
    description:
      "KPIs, semáforo, gráfico por cliente y tabla: control de procesos activos y atrasados.",
    Icon: Building2,
    demoOrder: 1,
  },
  {
    href: "/portal-rrhh/reportes/estatus-candidatos-por-etapa",
    title: "Estatus candidatos por etapa",
    description:
      "Embudo visual, distribución y alertas por estancamiento en el pipeline.",
    Icon: GitBranch,
    demoOrder: 2,
  },
  {
    href: "/portal-rrhh/reportes/evaluaciones-tecnicas",
    title: "Evaluaciones técnicas",
    description:
      "Indicadores, ranking por puntaje, distribución por resultado y exportación CSV.",
    Icon: ClipboardCheck,
    demoOrder: 3,
  },
  {
    href: "/portal-rrhh/reportes/preliminary-match-scores",
    title: "Scores matching preliminar",
    description:
      "Detalle por candidato: score 0–100, nivel, estado y fechas del análisis preliminar.",
    Icon: Sparkles,
    demoOrder: 4,
  },
  {
    href: "/portal-rrhh/reportes/fuentes-reclutamiento",
    title: "Fuentes de reclutamiento",
    description:
      "Pastel por volumen, barras por contrataciones y conversión por canal.",
    Icon: Share2,
    demoOrder: 5,
  },
] as const

export default function ReportesHubPage() {
  const mainContent = (
    <div className="min-w-0 flex flex-col">
      <section className="px-4 py-6 md:px-8" aria-label="Encabezado de reportes">
        <PortalPageHeader
          title="Reportes"
          description="Elegí un reporte o el resumen agregado. Podés filtrar, revisar gráficos y bajar datos cuando aplique."
        />
      </section>
      <section
        className="grid gap-4 p-4 md:grid-cols-2 md:p-8"
        aria-label="Listado de reportes"
      >
        {REPORT_LINKS.map(({ href, title, description, Icon, demoOrder }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-vo-purple/40 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
            aria-label={`Abrir reporte: ${title}`}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-vo-purple/10 transition-colors group-hover:bg-vo-purple/15"
                aria-hidden
              >
                <Icon className="h-5 w-5 text-vo-purple" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {demoOrder === 0
                    ? "Resumen"
                    : `Paso ${demoOrder} · Demo`}
                </p>
                <h2 className="font-sans text-base font-semibold text-foreground">
                  {title}
                </h2>
                <p className="font-sans text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 font-sans text-sm font-medium text-vo-purple">
              <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
              Ver reporte
            </span>
          </Link>
        ))}
      </section>
    </div>
  )

  return (
    <RrhhReportsShell breadcrumbLabel="Reportes" breadcrumbTrail={null}>
      {mainContent}
    </RrhhReportsShell>
  )
}
