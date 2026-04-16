import { redirect } from "next/navigation"

/** Compatibilidad: la ruta canónica del hub es `/portal-rrhh/entrevistas`. */
export default function LegacyInterviewsHubRedirect() {
  redirect("/portal-rrhh/entrevistas")
}
