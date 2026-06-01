import { redirect } from "next/navigation"

/** Compatibilidad: el alta abre el modal en el listado de entrevistas de la vacante. */
export default async function LegacyVacancyInterviewsNewRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(
    `/portal-rrhh/entrevistas/${encodeURIComponent(id)}?nueva=1`
  )
}
