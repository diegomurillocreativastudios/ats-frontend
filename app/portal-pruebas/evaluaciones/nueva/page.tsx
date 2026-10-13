import { getTranslations } from "next-intl/server"
import PortalPageHeader from "@/components/ui/PortalPageHeader"

export default async function PortalPruebasEvaluationNewPage() {
  const t = await getTranslations("PruebasPortal.evaluations.editorPlaceholder")

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <PortalPageHeader
        id="pruebas-evaluation-new"
        title={t("title")}
        description={t("description")}
      />
    </div>
  )
}
