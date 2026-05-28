import { Suspense } from "react"
import { PublicVacanciesPage } from "@/components/public/PublicVacanciesPage"

export const metadata = {
  title: { absolute: "ATS | Oportunidades" },
  description: "Explorá vacantes activas por departamento y modalidad",
}

function OpportunitiesPageFallback() {
  return <div className="min-h-screen bg-[#0b1224]" aria-hidden />
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<OpportunitiesPageFallback />}>
      <PublicVacanciesPage />
    </Suspense>
  )
}
