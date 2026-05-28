import { Suspense } from "react"
import { PublicVacancyApplyPage } from "@/components/public/PublicVacancyApplyPage"

export const metadata = {
  title: { absolute: "ATS | Oportunidades | Aplicar" },
  description: "Formulario público para aplicar a una vacante activa",
}

function OpportunityApplyPageFallback() {
  return <div className="min-h-screen bg-[#f5f7ff]" aria-hidden />
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
