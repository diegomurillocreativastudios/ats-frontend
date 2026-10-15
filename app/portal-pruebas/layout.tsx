import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { PruebasPortalShell } from "@/components/pruebas/layout/pruebas-portal-shell"
import { NOINDEX_NOFOLLOW } from "@/lib/seo/public-metadata"
import { requirePortalRecruiterUser } from "@/lib/server-session-user"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.pruebasPortal")
  return {
    title: t("title"),
    description: t("description"),
    robots: NOINDEX_NOFOLLOW,
  }
}

export default async function PortalPruebasLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePortalRecruiterUser()
  return <PruebasPortalShell>{children}</PruebasPortalShell>
}
