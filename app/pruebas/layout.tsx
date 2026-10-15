import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { NOINDEX_NOFOLLOW } from "@/lib/seo/public-metadata"
import { requirePortalRecruiterUser } from "@/lib/server-session-user"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.pruebasCandidateDemo")
  return {
    title: t("title"),
    description: t("description"),
    robots: NOINDEX_NOFOLLOW,
  }
}

/**
 * Candidate demo experience. Requires staff session; no public path exception.
 * Does not use PruebasPortalShell (no staff sidebar).
 */
export default async function PruebasCandidateDemoLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePortalRecruiterUser()
  return (
    <div className="min-h-screen bg-background text-foreground">{children}</div>
  )
}
