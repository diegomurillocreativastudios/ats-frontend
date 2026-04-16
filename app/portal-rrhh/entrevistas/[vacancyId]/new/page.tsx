import { redirect } from "next/navigation"

/** Compatibilidad: el alta se hace en modal sobre el listado de la vacante. */
export default async function EntrevistasNewRedirect({
  params,
}: {
  params: Promise<{ vacancyId: string }>
}) {
  const { vacancyId } = await params
  redirect(
    `/portal-rrhh/entrevistas/${encodeURIComponent(vacancyId)}?nueva=1`
  )
}
