import { redirect } from "next/navigation"

/** Compatibilidad: usar `/portal-rrhh/entrevistas/[vacancyId]`. */
export default async function LegacyVacancyInterviewsRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/portal-rrhh/entrevistas/${encodeURIComponent(id)}`)
}
