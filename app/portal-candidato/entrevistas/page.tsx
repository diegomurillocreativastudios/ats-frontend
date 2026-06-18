import { getTranslations } from "next-intl/server"
import CandidateInterviewsContent from "@/components/candidato/CandidateInterviewsContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.candidatePortal.interviews")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default function PortalCandidatoEntrevistasPage() {
  return <CandidateInterviewsContent />
}
