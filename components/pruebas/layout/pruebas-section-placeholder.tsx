import { getTranslations } from "next-intl/server"
import PortalPageHeader from "@/components/ui/PortalPageHeader"
import type { PruebasNavKey } from "@/lib/pruebas/portal-nav"

interface PruebasSectionPlaceholderProps {
  navKey: PruebasNavKey
}

export async function PruebasSectionPlaceholder({
  navKey,
}: PruebasSectionPlaceholderProps) {
  const t = await getTranslations("PruebasPortal")
  const title = t(`nav.${navKey}`)

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader
        id={`pruebas-section-${navKey}`}
        title={title}
        description={t("placeholder")}
      />
    </div>
  )
}
