import { PublicVacancyDetailPage } from "@/components/public/PublicVacancyDetailPage"

export const metadata = {
  title: { absolute: "ATS | Oportunidades | Vacante" },
  description: "Detalle público de una vacante activa",
}

export default async function OpportunityDetailRoute({
  params,
}: {
  params: Promise<{ vacanteId: string }>
}) {
  const { vacanteId } = await params

  return <PublicVacancyDetailPage vacancyId={vacanteId} />
}
