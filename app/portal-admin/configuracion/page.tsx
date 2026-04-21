import PortalPageHeader from "@/components/ui/PortalPageHeader"

export const metadata = {
  title: "Configuracion",
  description: "Configuración general del portal de administración",
}

export default function PortalAdminConfiguracionPage() {
  return (
    <div className="min-w-0 flex flex-col">
      <section
        className="px-4 py-6 md:px-8"
        aria-label="Configuración del portal admin"
      >
        <PortalPageHeader
          title="Configuracion"
          description="Esta vista queda lista para centralizar las configuraciones del portal admin."
          contentClassName="max-w-3xl"
        />
      </section>
    </div>
  )
}
