import { redirect } from "next/navigation"

import { NOINDEX_NOFOLLOW } from "@/lib/seo/public-metadata"

export const metadata = {
  robots: NOINDEX_NOFOLLOW,
}

export default function RecuperarContrasenaRedirectPage() {
  redirect("/auth/olvidaste-tu-contrasena")
}
