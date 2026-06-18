import { getTranslations } from "next-intl/server"
import CandidatePortalHome from "@/components/candidato/candidate-portal-home"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.candidatePortal.home")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default function CandidatePortalHomePage() {
  return <CandidatePortalHome />
}
