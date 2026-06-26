import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { PublicVacancyDetailPage } from "@/components/public/PublicVacancyDetailPage"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.publicOpportunities.detail")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

function OpportunityDetailPageFallback() {
  return <div className="min-h-screen bg-ats-warm-white" aria-hidden />
}

export default async function OpportunityDetailRoute({
  params,
}: {
  params: Promise<{ vacanteId: string }>
}) {
  const { vacanteId } = await params

  return (
    <Suspense fallback={<OpportunityDetailPageFallback />}>
      <PublicVacancyDetailPage vacancyId={vacanteId} />
    </Suspense>
  )
}
