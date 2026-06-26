import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterVacancyResults")

  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default function VacancyResultadosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
