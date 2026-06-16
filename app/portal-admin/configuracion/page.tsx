import { getTranslations } from "next-intl/server"
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
    <div className="min-w-0 flex flex-col">
      <section className="px-4 py-6 md:px-8" aria-label={t("regionAria")}>
        <PortalPageHeader
          title={t("title")}
          description={t("description")}
          contentClassName="max-w-3xl"
        />
      </section>
    </div>
  )
}
