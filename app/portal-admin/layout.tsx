import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { PortalAdminShell } from "@/components/portal-admin/PortalAdminShell"
import { requirePortalAdminUser } from "@/lib/server-session-user"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.adminPortal")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function PortalAdminLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePortalAdminUser()
  return <PortalAdminShell>{children}</PortalAdminShell>
}
