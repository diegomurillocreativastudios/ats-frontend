import { CandidateSnackbarProvider } from "@/components/candidato/candidate-portal-snackbar"
import type { ReactNode } from "react"
import { requirePortalCandidateUser } from "@/lib/server-session-user"

export const dynamic = "force-dynamic"

export default async function PortalCandidatoLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePortalCandidateUser()
  return <CandidateSnackbarProvider>{children}</CandidateSnackbarProvider>
}
