import { getTranslations } from "next-intl/server"
import { AdminInterviewCatalogContent } from "@/components/portal-admin/AdminInterviewCatalogContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.interviewStatuses")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminInterviewStatusesPage() {
  return <AdminInterviewCatalogContent catalog="statuses" />
}
