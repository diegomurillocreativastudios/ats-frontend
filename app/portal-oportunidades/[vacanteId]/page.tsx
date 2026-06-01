import { Suspense } from "react"
import { PublicVacancyDetailPage } from "@/components/public/PublicVacancyDetailPage"

export const metadata = {
  title: { absolute: "ATS | Oportunidades | Vacante" },
  description: "Detalle público de una vacante activa",
}

function OpportunityDetailPageFallback() {
  return <div className="min-h-screen bg-[#0b1224]" aria-hidden />
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
