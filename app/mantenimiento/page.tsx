import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { MaintenanceScreen } from "@/components/maintenance/maintenance-screen"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.maintenance")
  return {
    title: { absolute: t("title") },
    description: t("description"),
    robots: { index: false, follow: false },
  }
}

export default async function MantenimientoPage() {
  const t = await getTranslations("Maintenance")
  return (
    <MaintenanceScreen
      title={t("title")}
      description={t("description")}
      loadingLabel={t("loading")}
    />
  )
}
