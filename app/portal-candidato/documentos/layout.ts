import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.candidatePortal.documents")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default function PortalCandidatoDocumentosLayout({ children }) {
  return children
}
