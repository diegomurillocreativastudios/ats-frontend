import type { ReactNode } from "react"
import { PortalAdminShell } from "@/components/portal-admin/PortalAdminShell"
import { requirePortalAdminUser } from "@/lib/server-session-user"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Portal Admin",
  description: "Administración de la plataforma ATS",
}

export default async function PortalAdminLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePortalAdminUser()
  return <PortalAdminShell>{children}</PortalAdminShell>
}
