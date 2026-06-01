import { Suspense } from "react"
import RestablecerContrasenaContent from "@/app/restablecer-contrasena/RestablecerContrasenaContent"

export const metadata = {
  title: { absolute: "ATS | Restablecer contraseña" },
  description:
    "Definí una nueva contraseña con el enlace del correo o tras verificar tu correo",
}

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background font-sans text-muted-foreground">
    <p className="text-sm">Cargando…</p>
  </div>
)

export default function AuthRestablecerContrasenaPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RestablecerContrasenaContent />
    </Suspense>
  )
}
