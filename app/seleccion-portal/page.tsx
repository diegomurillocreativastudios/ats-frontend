import Link from "next/link"
import { Briefcase, Shield, Users } from "lucide-react"
import { getServerSessionUser } from "@/lib/server-session-user"
import { isAdminRole } from "@/lib/roles"

export const metadata = {
  title: { absolute: "ATS | Elegí un portal" },
  description: "Seleccioná el portal de candidato o el de reclutamiento",
}

export default async function SeleccionPortalPage() {
  const sessionUser = await getServerSessionUser()
  const showAdmin = isAdminRole(sessionUser?.role)

  return (
    <div className="min-h-screen bg-muted/40 font-sans text-foreground">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12 md:px-6">
        <header className="mb-10 text-center">
          <p className="font-sans text-sm font-medium text-vo-purple">ATS App</p>
          <h1 className="mt-2 font-sans text-2xl font-bold tracking-tight md:text-3xl">
            ¿A dónde querés ingresar?
          </h1>
          <p className="mt-2 font-sans text-sm text-muted-foreground md:text-base">
            Elegí el portal según tu rol para continuar
          </p>
        </header>

        <div
          className={`grid gap-4 md:gap-6 ${
            showAdmin ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          <Link
            href="/portal-candidato"
            data-testid="portal-selector-candidato"
            className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-vo-purple/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
            aria-label="Ir al portal del candidato"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-vo-sky/15 text-vo-navy">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <span className="mt-4 font-sans text-lg font-semibold text-foreground group-hover:text-vo-purple">
              Portal candidato
            </span>
            <span className="mt-2 font-sans text-sm text-muted-foreground">
              Tu proceso, documentos y postulaciones
            </span>
            <span className="mt-4 font-sans text-sm font-medium text-vo-purple group-hover:underline">
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
            <span className="mt-4 font-sans text-lg font-semibold text-foreground group-hover:text-vo-purple">
              Portal RRHH
            </span>
            <span className="mt-2 font-sans text-sm text-muted-foreground">
              Candidatos, vacantes, plantillas y etapas
            </span>
            <span className="mt-4 font-sans text-sm font-medium text-vo-purple group-hover:underline">
              Entrar →
            </span>
          </Link>

          {showAdmin ? (
            <Link
              href="/portal-admin/usuarios"
              data-testid="portal-selector-admin"
              className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-vo-purple/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              aria-label="Ir al portal de administración"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-vo-navy/10 text-vo-navy">
                <Shield className="h-6 w-6" aria-hidden />
              </span>
              <span className="mt-4 font-sans text-lg font-semibold text-foreground group-hover:text-vo-purple">
                Portal administración
              </span>
              <span className="mt-2 font-sans text-sm text-muted-foreground">
                Usuarios y configuración de plataforma
              </span>
              <span className="mt-4 font-sans text-sm font-medium text-vo-purple group-hover:underline">
                Entrar →
              </span>
            </Link>
          ) : null}
        </div>

        <p className="mt-10 text-center font-sans text-xs text-muted-foreground">
          Podés cambiar de portal más tarde desde el menú o cerrando sesión y volviendo a iniciar sesión.
        </p>
      </div>
    </div>
  )
}
