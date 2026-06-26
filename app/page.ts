import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { APP_NAME } from "@/lib/app-brand"
import { AUTH_COOKIES } from "@/lib/auth"

export const metadata = {
  title: { absolute: `${APP_NAME} | Inicio` },
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
