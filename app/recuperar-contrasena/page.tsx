import { redirect } from "next/navigation"

export default function RecuperarContrasenaRedirectPage() {
  redirect("/auth/olvidaste-tu-contrasena")
}
