import { PublicVacanciesPage } from "@/components/public/PublicVacanciesPage"

export const metadata = {
  title: { absolute: "ATS | Oportunidades" },
  description: "Explorá vacantes activas por departamento y modalidad",
}

export default function OpportunitiesPage() {
  return <PublicVacanciesPage />
}
