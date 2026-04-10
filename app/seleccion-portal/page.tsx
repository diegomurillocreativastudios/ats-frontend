import Link from "next/link"
import { Briefcase, Users } from "lucide-react"

export const metadata = {
  title: { absolute: "ATS | Elegí un portal" },
  description: "Seleccioná el portal de candidato o el de reclutamiento",
}

export default function SeleccionPortalPage() {
  return (
    <div className="min-h-screen bg-muted/40 font-inter text-foreground">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12 md:px-6">
        <header className="mb-10 text-center">
          <p className="font-inter text-sm font-medium text-vo-purple">ATS App</p>
          <h1 className="mt-2 font-inter text-2xl font-bold tracking-tight md:text-3xl">
            ¿A dónde querés ingresar?
          </h1>
          <p className="mt-2 font-inter text-sm text-muted-foreground md:text-base">
            Elegí el portal según tu rol para continuar
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Link
            href="/portal-candidato"
            data-testid="portal-selector-candidato"
            className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-vo-purple/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            aria-label="Ir al portal del candidato"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-vo-sky/15 text-vo-navy">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <span className="mt-4 font-inter text-lg font-semibold text-foreground group-hover:text-vo-purple">
              Portal candidato
            </span>
            <span className="mt-2 font-inter text-sm text-muted-foreground">
              Tu proceso, documentos y postulaciones
            </span>
            <span className="mt-4 font-inter text-sm font-medium text-vo-purple group-hover:underline">
              Entrar →
            </span>
          </Link>

          <Link
            href="/portal-rrhh"
            data-testid="portal-selector-rrhh"
            className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-vo-purple/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            aria-label="Ir al portal de reclutamiento RRHH"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-vo-purple/10 text-vo-purple">
              <Briefcase className="h-6 w-6" aria-hidden />
            </span>
            <span className="mt-4 font-inter text-lg font-semibold text-foreground group-hover:text-vo-purple">
              Portal RRHH
            </span>
            <span className="mt-2 font-inter text-sm text-muted-foreground">
              Candidatos, vacantes, plantillas y etapas
            </span>
            <span className="mt-4 font-inter text-sm font-medium text-vo-purple group-hover:underline">
              Entrar →
            </span>
          </Link>
        </div>

        <p className="mt-10 text-center font-inter text-xs text-muted-foreground">
          Podés cambiar de portal más tarde desde el menú o cerrando sesión y volviendo a iniciar sesión.
        </p>
      </div>
    </div>
  )
}
