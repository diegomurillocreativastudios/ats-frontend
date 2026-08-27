import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal.stages")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function PortalAdminEtapasLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
