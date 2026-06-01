import { CandidateSnackbarProvider } from "@/components/candidato/candidate-portal-snackbar"
import type { ReactNode } from "react"

export default function PortalCandidatoLayout({ children }: { children: ReactNode }) {
  return <CandidateSnackbarProvider>{children}</CandidateSnackbarProvider>
}
