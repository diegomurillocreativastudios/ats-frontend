import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterPortal")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default function PortalRRHHLayout({ children }) {
  return children
}
