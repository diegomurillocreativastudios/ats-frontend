import { getTranslations } from "next-intl/server"
import { AdminVacancyCatalogContent } from "@/components/portal-admin/AdminVacancyCatalogContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.vacancyTypes")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminVacancyTypeCatalogPage() {
  return <AdminVacancyCatalogContent catalog="vacancyTypes" />
}
