import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterVacancyDetail")

  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default function VacancyDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
