import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { PublicVacancyApplyPage } from "@/components/public/PublicVacancyApplyPage"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.publicOpportunities.apply")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

function OpportunityApplyPageFallback() {
  return <div className="h-dvh bg-ats-warm-white" aria-hidden />
}

export default async function OpportunityApplyRoute({
  params,
}: {
  params: Promise<{ vacanteId: string }>
}) {
  const { vacanteId } = await params

  return (
    <Suspense fallback={<OpportunityApplyPageFallback />}>
      <PublicVacancyApplyPage vacancyId={vacanteId} />
    </Suspense>
  )
}
