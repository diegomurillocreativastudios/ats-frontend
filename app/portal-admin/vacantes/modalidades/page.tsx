import { getTranslations } from "next-intl/server"
import { AdminVacancyCatalogContent } from "@/components/portal-admin/AdminVacancyCatalogContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.modalities")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminModalityCatalogPage() {
  return <AdminVacancyCatalogContent catalog="modalities" />
}
