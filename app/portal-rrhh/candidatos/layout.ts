import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterCandidates")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default function CandidatosLayout({ children }) {
  return children
}
