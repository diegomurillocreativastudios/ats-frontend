import { redirect } from "next/navigation"

/** Las plantillas se administran en Portal Admin. */
export default function PlantillasRrhhRedirect() {
  redirect("/portal-admin/plantillas")
}
