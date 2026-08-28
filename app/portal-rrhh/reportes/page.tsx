import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"
import RrhhReportsShell from "@/components/rrhh/reportes/rrhh-reports-shell"
import { ReportsHubClient } from "@/components/rrhh/reportes/reports-hub-client"
import PortalPageHeader from "@/components/ui/PortalPageHeader"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterReports")

  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default function ReportesHubPage() {
  const t = useTranslations("RecruiterPortal.reports")

  const mainContent = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <section
        className="shrink-0 px-4 pt-6 md:px-8"
        aria-label={t("page.headerRegionLabel")}
      >
        <PortalPageHeader
          className="shrink-0 pb-2"
          title={t("page.title")}
          description={t("page.description")}
        />
      </section>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2 md:px-8">
        <ReportsHubClient />
      </div>
    </div>
  )

  return (
    <RrhhReportsShell breadcrumbLabel={t("breadcrumb")} breadcrumbTrail={null}>
      {mainContent}
    </RrhhReportsShell>
  )
}
