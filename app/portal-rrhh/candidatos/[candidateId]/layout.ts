import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterCandidateDetail")

  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default function CandidatoDetalleLayout({ children }) {
  return children
}
