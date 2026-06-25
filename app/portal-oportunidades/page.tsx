import { getTranslations } from "next-intl/server"
import { PublicVacanciesPage } from "@/components/public/PublicVacanciesPage"
import { buildPublicOpportunitiesQueryString } from "@/lib/public-opportunities-query"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.publicOpportunities.list")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const initialQueryString = buildPublicOpportunitiesQueryString(query)

  return <PublicVacanciesPage initialQueryString={initialQueryString} />
}
