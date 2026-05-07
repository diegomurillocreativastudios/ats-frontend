import Link from "next/link"
import { CalendarClock, ChevronRight } from "lucide-react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"
import PortalPageHeader from "@/components/ui/PortalPageHeader"

export const metadata = {
  title: "Configuracion",
  description: "Configuración del portal RRHH",
}

export default function RRHHConfiguracionPage() {
  const trail = [
    { label: "Portal RRHH", href: "/portal-rrhh/entrevistas" },
    { label: "Configuracion" },
  ]

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <RRHHSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <RRHHTopbar
            variant="desktop"
            breadcrumbLabel="Configuracion"
            breadcrumbTrail={trail}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <section className="flex flex-col gap-6 px-4 py-6 md:px-8">
              <PortalPageHeader
                title="Configuracion"
                description="Centraliza aquí las configuraciones funcionales del portal RRHH."
                contentClassName="max-w-3xl"
              />
              <Link
                href="/portal-rrhh/configuracion/calendario"
                className="flex w-full max-w-xl items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-vo-purple/10"
                    aria-hidden
                  >
                    <CalendarClock className="h-5 w-5 text-vo-purple" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-sans text-sm font-semibold text-foreground">
                      Calendario Google
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      Conecta y administra la sincronización de entrevistas.
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Link>
            </section>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <RRHHTopbar
          variant="tablet"
          breadcrumbLabel="Configuracion"
          breadcrumbTrail={trail}
        />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <section className="flex flex-col gap-6 px-4 py-6">
            <PortalPageHeader
              title="Configuracion"
              description="Centraliza aquí las configuraciones funcionales del portal RRHH."
            />
            <Link
              href="/portal-rrhh/configuracion/calendario"
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-vo-purple" aria-hidden />
                <span className="font-sans text-sm font-semibold text-foreground">
                  Calendario Google
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </Link>
          </section>
        </main>
      </div>
    </div>
  )
}
