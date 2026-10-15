import { notFound, permanentRedirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { PublicVacancyApplyPage } from "@/components/public/PublicVacancyApplyPage"
import {
  buildPublicPageMetadata,
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
  const tApply = await getTranslations("PublicOpportunities.apply")
  const tMeta = await getTranslations("Metadata.publicOpportunities.apply")
  const result = await loadPublicVacancyForSeo(vacanteId)
  const origin = readPublicOrigin()

  if (result.status !== "ok") {
    return buildPublicPageMetadata({
      title: tMeta("title"),
      description: tMeta("description"),
      canonicalPath: `/portal-oportunidades/${encodeURIComponent(vacanteId)}`,
      origin,
      robots: NOINDEX_NOFOLLOW,
    })
  }

  return buildPublicPageMetadata({
    title: tApply("documentTitle", { title: result.vacancy.title }),
    description: resolveMetaDescription(
      result.vacancy.description ?? result.vacancy.summary,
      tMeta("description")
    ),
    canonicalPath: vacancyCanonicalPath(result.vacancy),
    origin,
    robots: NOINDEX_NOFOLLOW,
  })
}

function OpportunityApplyPageFallback() {
  return <div className="h-dvh bg-ats-warm-white" aria-hidden />
}

export default async function OpportunityApplyRoute({
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
      "aplicar",
      toSearchQueryString(query)
    )
    if (nextPath) permanentRedirect(nextPath)
  }

  return (
    <Suspense fallback={<OpportunityApplyPageFallback />}>
      <PublicVacancyApplyPage vacancyId={vacanteId} />
    </Suspense>
  )
}
