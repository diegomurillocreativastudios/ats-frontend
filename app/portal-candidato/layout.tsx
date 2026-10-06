import { CandidateSnackbarProvider } from "@/components/candidato/candidate-portal-snackbar"
import type { ReactNode } from "react"
import { NOINDEX_NOFOLLOW } from "@/lib/seo/public-metadata"
import { requirePortalCandidateUser } from "@/lib/server-session-user"

export async function generateMetadata() {
  return { robots: NOINDEX_NOFOLLOW }
}

export const dynamic = "force-dynamic"

export default async function PortalCandidatoLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePortalCandidateUser()
  return <CandidateSnackbarProvider>{children}</CandidateSnackbarProvider>
}
