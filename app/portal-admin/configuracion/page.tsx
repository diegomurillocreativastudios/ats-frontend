import { Cog } from "lucide-react"

export const metadata = {
  title: "Configuracion",
  description: "Configuración general del portal de administración",
}

export default function PortalAdminConfiguracionPage() {
  return (
    <div className="min-w-0 flex flex-col">
      <section
        className="flex flex-col gap-3 border-b border-border px-4 py-6 md:px-8"
        aria-label="Configuración del portal admin"
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vo-purple/10"
            aria-hidden
          >
            <Cog className="h-5 w-5 text-vo-purple" />
          </div>
          <h1 className="font-inter text-2xl font-bold text-foreground">
            Configuracion
          </h1>
        </div>
        <p className="max-w-2xl font-inter text-sm text-muted-foreground">
          Esta vista queda lista para centralizar las configuraciones del portal
          admin.
        </p>
      </section>
    </div>
  )
}
