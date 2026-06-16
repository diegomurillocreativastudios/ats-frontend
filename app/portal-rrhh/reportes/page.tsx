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
    <div className="min-w-0 flex flex-col">
      <section className="px-4 py-6 md:px-8" aria-label={t("page.headerRegionLabel")}>
        <PortalPageHeader
          title={t("page.title")}
          description={t("page.description")}
        />
      </section>
      <ReportsHubClient />
    </div>
  )

  return (
    <RrhhReportsShell breadcrumbLabel={t("breadcrumb")} breadcrumbTrail={null}>
      {mainContent}
    </RrhhReportsShell>
  )
}
