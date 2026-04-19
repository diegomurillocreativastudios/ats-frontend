import Link from "next/link"
import { Settings2, CalendarClock, ChevronRight } from "lucide-react"
import RRHHSidebar from "@/components/rrhh/RRHHSidebar"
import RRHHTopbar from "@/components/rrhh/RRHHTopbar"

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
            <section className="flex flex-col gap-6 border-b border-border px-4 py-6 md:px-8">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-vo-purple/10"
                  aria-hidden
                >
                  <Settings2 className="h-5 w-5 text-vo-purple" />
                </div>
                <h1 className="font-inter text-2xl font-bold text-foreground">
                  Configuracion
                </h1>
              </div>
              <p className="max-w-2xl font-inter text-sm text-muted-foreground">
                Centraliza aqui las configuraciones funcionales del portal RRHH.
              </p>

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
                    <span className="font-inter text-sm font-semibold text-foreground">
                      Calendario Google
                    </span>
                    <span className="font-inter text-xs text-muted-foreground">
                      Conecta y administra la sincronizacion de entrevistas.
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
          <section className="flex flex-col gap-6 border-b border-border px-4 py-6">
            <div className="flex items-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-vo-purple/10"
                aria-hidden
              >
                <Settings2 className="h-5 w-5 text-vo-purple" />
              </div>
              <h1 className="font-inter text-2xl font-bold text-foreground">
                Configuracion
              </h1>
            </div>
            <p className="font-inter text-sm text-muted-foreground">
              Centraliza aqui las configuraciones funcionales del portal RRHH.
            </p>
            <Link
              href="/portal-rrhh/configuracion/calendario"
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-vo-purple" aria-hidden />
                <span className="font-inter text-sm font-semibold text-foreground">
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
