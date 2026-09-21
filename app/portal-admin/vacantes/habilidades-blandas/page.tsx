import { getTranslations } from "next-intl/server"
import { AdminVacancyCatalogContent } from "@/components/portal-admin/AdminVacancyCatalogContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.softSkills")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminSoftSkillsCatalogPage() {
  return <AdminVacancyCatalogContent catalog="softSkills" />
}
