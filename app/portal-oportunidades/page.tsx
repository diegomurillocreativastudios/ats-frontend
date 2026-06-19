import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { PublicVacanciesPage } from "@/components/public/PublicVacanciesPage"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.publicOpportunities.list")
  return {
    title: { absolute: t("title") },
    description: t("description"),
  }
}

function OpportunitiesPageFallback() {
  return <div className="min-h-screen bg-ats-warm-white" aria-hidden />
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<OpportunitiesPageFallback />}>
      <PublicVacanciesPage />
    </Suspense>
  )
}
