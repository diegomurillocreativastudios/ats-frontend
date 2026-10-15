import { notFound, permanentRedirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { PublicVacancyDetailPage } from "@/components/public/PublicVacancyDetailPage"
import { PublicVacancyJobPosting } from "@/components/public/PublicVacancyJobPosting"
import {
  buildPublicPageMetadata,
  INDEX_FOLLOW,
  NOINDEX_NOFOLLOW,
  resolveMetaDescription,
  slugRedirectPath,
  toSearchQueryString,
  vacancyCanonicalPath,
} from "@/lib/seo/public-metadata"
import { loadPublicVacancyForSeo } from "@/lib/seo/public-vacancy"
import { readPublicOrigin } from "@/lib/seo/site-origin"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vacanteId: string }>
}) {
  const { vacanteId } = await params
  const tDetail = await getTranslations("PublicOpportunities.detail")
  const tMeta = await getTranslations("Metadata.publicOpportunities.detail")
  const result = await loadPublicVacancyForSeo(vacanteId)
  const origin = readPublicOrigin()

  if (result.status !== "ok") {
    return buildPublicPageMetadata({
      title: tMeta("title"),
      description: tMeta("description"),
      canonicalPath: `/portal-oportunidades/${encodeURIComponent(vacanteId)}`,
      origin,
      robots: result.status === "not_found" ? NOINDEX_NOFOLLOW : INDEX_FOLLOW,
    })
  }

  return buildPublicPageMetadata({
    title: tDetail("documentTitle", { title: result.vacancy.title }),
    description: resolveMetaDescription(
      result.vacancy.description ?? result.vacancy.summary,
      tMeta("description")
    ),
    canonicalPath: vacancyCanonicalPath(result.vacancy),
    origin,
    robots: INDEX_FOLLOW,
  })
}

function OpportunityDetailPageFallback() {
  return <div className="h-dvh bg-ats-warm-white" aria-hidden />
}

export default async function OpportunityDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ vacanteId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { vacanteId } = await params
  const query = await searchParams
  const result = await loadPublicVacancyForSeo(vacanteId)

  if (result.status === "not_found") notFound()

  if (result.status === "ok") {
    const nextPath = slugRedirectPath(
      vacanteId,
      result.vacancy,
      "",
      toSearchQueryString(query)
    )
    if (nextPath) permanentRedirect(nextPath)
  }

  return (
    <>
      {result.status === "ok" ? (
        <PublicVacancyJobPosting vacancy={result.vacancy} />
      ) : null}
      <Suspense fallback={<OpportunityDetailPageFallback />}>
        <PublicVacancyDetailPage vacancyId={vacanteId} />
      </Suspense>
    </>
  )
}
