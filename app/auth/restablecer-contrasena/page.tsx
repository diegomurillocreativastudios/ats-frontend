import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import RestablecerContrasenaContent from "@/app/restablecer-contrasena/RestablecerContrasenaContent"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.auth.resetPassword")

  return {
    title: t("title"),
    description: t("description"),
  }
}

const LoadingFallback = ({ label }: { label: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-background font-sans text-muted-foreground">
    <p className="text-sm">{label}</p>
  </div>
)

export default async function AuthRestablecerContrasenaPage() {
  const t = await getTranslations("Auth")
  return (
    <Suspense fallback={<LoadingFallback label={t("loadingFallback")} />}>
      <RestablecerContrasenaContent />
    </Suspense>
  )
}
