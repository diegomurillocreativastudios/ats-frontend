import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.templates")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminPlantillasLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
