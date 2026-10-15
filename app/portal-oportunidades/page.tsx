import { getTranslations } from "next-intl/server"

import { PublicVacanciesPage } from "@/components/public/PublicVacanciesPage"
import { buildPublicOpportunitiesQueryString } from "@/lib/public-opportunities-query"
import {
  buildPublicPageMetadata,
  hasPublicListQuery,
  INDEX_FOLLOW,
  NOINDEX_FOLLOW,
} from "@/lib/seo/public-metadata"
import { readPublicOrigin } from "@/lib/seo/site-origin"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getTranslations("Metadata.publicOpportunities.list")
  const query = await searchParams

  return buildPublicPageMetadata({
    title: t("title"),
    description: t("description"),
    canonicalPath: "/portal-oportunidades",
    origin: readPublicOrigin(),
    robots: hasPublicListQuery(query) ? NOINDEX_FOLLOW : INDEX_FOLLOW,
  })
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
