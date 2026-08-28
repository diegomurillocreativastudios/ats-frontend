import { getTranslations } from "next-intl/server"
import { AdminPageFrame } from "@/components/portal-admin/admin-page-chrome"
import PortalPageHeader from "@/components/ui/PortalPageHeader"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.configuration")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function PortalAdminConfiguracionPage() {
  const t = await getTranslations("AdminPortal.configuration")
  return (
    <AdminPageFrame ariaLabel={t("regionAria")}>
      <PortalPageHeader
        title={t("title")}
        description={t("description")}
        layout="split"
        contentClassName="max-w-3xl"
      />
    </AdminPageFrame>
  )
}
