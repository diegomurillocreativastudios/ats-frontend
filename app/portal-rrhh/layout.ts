import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { NOINDEX_NOFOLLOW } from "@/lib/seo/public-metadata"
import { requirePortalRecruiterUser } from "@/lib/server-session-user"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterPortal")
  return {
    title: { absolute: t("title") },
    description: t("description"),
    robots: NOINDEX_NOFOLLOW,
  }
}

export default async function PortalRRHHLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePortalRecruiterUser()
  return children
}
