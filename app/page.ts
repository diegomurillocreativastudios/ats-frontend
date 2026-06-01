import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AUTH_COOKIES } from "@/lib/auth"

export const metadata = {
  title: { absolute: "ATS | Inicio" },
  description: "Portal de reclutamiento",
}

export default async function HomePage() {
  const cookieStore = await cookies()
  const hasToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!hasToken) {
    redirect("/auth/iniciar-sesion")
  }
  redirect("/seleccion-portal")
}
