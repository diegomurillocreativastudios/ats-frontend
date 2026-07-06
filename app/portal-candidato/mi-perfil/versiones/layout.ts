import { getTranslations } from "next-intl/server"

import type { ReactNode } from "react"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.candidatePortal.profileVersions")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default function MiPerfilVersionesLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
