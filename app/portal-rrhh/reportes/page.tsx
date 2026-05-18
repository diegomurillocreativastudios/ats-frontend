import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import { ReportsHubClient } from "@/components/rrhh/reportes/reports-hub-client"
import PortalPageHeader from "@/components/ui/PortalPageHeader"

export default function ReportesHubPage() {
  const mainContent = (
    <div className="min-w-0 flex flex-col">
      <section className="px-4 py-6 md:px-8" aria-label="Encabezado de reportes">
        <PortalPageHeader
          title="Reportes"
          description="Elegí un reporte desde plantillas o las vistas del sistema. Podés filtrar, revisar gráficos y bajar datos cuando aplique."
        />
      </section>
      <ReportsHubClient />
    </div>
  )

  return (
    <RrhhReportsShell breadcrumbLabel="Reportes" breadcrumbTrail={null}>
      {mainContent}
    </RrhhReportsShell>
  )
}
