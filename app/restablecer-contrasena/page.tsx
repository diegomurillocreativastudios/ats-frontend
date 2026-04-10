import { Suspense } from "react"
import RestablecerContrasenaContent from "./RestablecerContrasenaContent"

export const metadata = {
  title: { absolute: "ATS | Restablecer contraseña" },
  description:
    "Definí una nueva contraseña tras verificar tu correo o con el enlace de recuperación",
}

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background font-inter text-muted-foreground">
    <p className="text-sm">Cargando…</p>
  </div>
)

export default function RestablecerContrasenaPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RestablecerContrasenaContent />
    </Suspense>
  )
}
