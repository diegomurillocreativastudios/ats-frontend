import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import RestablecerContrasenaContent from "./RestablecerContrasenaContent"

export const metadata = {
  title: { absolute: "ATS | Restablecer contraseña" },
  description:
    "Definí una nueva contraseña tras verificar tu correo o con el enlace de recuperación",
}

const LoadingFallback = ({ label }: { label: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-background font-sans text-muted-foreground">
    <p className="text-sm">{label}</p>
  </div>
)

export default async function RestablecerContrasenaPage() {
  const t = await getTranslations("Auth")
  return (
    <Suspense fallback={<LoadingFallback label={t("loadingFallback")} />}>
      <RestablecerContrasenaContent />
    </Suspense>
  )
}
