import { redirect } from "next/navigation"

export default function ForgotPasswordLegacyRedirectPage() {
  redirect("/auth/olvidaste-tu-contrasena")
}
