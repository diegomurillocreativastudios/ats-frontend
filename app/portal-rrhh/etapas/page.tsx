import { redirect } from "next/navigation"

/** Las etapas se administran en Portal Admin. */
export default function EtapasRrhhRedirect() {
  redirect("/portal-admin/vacantes/etapas")
}
