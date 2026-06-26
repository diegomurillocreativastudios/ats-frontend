import { getTranslations } from "next-intl/server"
import MiPerfilContent from "./MiPerfilContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.candidateProfile")

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default function MiPerfilPage() {
  return <MiPerfilContent />
}
