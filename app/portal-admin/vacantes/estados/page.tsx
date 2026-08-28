import { getTranslations } from "next-intl/server"
import { AdminStageStatusesContent } from "@/components/portal-admin/AdminStageStatusesContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.stageStatuses")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminStageStatusesPage() {
  return <AdminStageStatusesContent />
}
