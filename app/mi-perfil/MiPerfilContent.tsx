"use client"

import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { UserCircle } from "lucide-react"

const emptyDash = (value: string | null | undefined) =>
  value != null && String(value).trim() !== "" ? String(value) : "—"

export default function MiPerfilContent() {
  const { user, loading } = useCurrentUser()
  const displayName = user?.name || user?.email || "—"
  const email = emptyDash(user?.email)
  const role = emptyDash(user?.role)

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <CandidateSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CandidateTopbar variant="desktop" breadcrumbLabel="Mi perfil" />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 flex flex-col gap-8 p-8">
              <section aria-labelledby="mi-perfil-titulo-desktop">
                <h1
                  id="mi-perfil-titulo-desktop"
                  className="font-inter text-[28px] font-bold text-foreground"
                >
                  Mi perfil
                </h1>
                <p className="mt-2 font-inter text-base text-muted-foreground">
                  Datos de tu cuenta en ATS App. Más opciones de edición se
                  agregarán cuando estén disponibles en el sistema.
                </p>
              </section>

              <section
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
                aria-labelledby="mi-perfil-datos-desktop"
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-vo-purple/10 text-vo-purple"
                    aria-hidden
                  >
                    <UserCircle className="h-10 w-10" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2
                      id="mi-perfil-datos-desktop"
                      className="font-inter text-lg font-semibold text-foreground"
                    >
                      Datos de la cuenta
                    </h2>
                    <dl className="mt-6 grid gap-6 sm:grid-cols-2">
                      <div>
                        <dt className="font-inter text-sm font-medium text-muted-foreground">
                          Nombre
                        </dt>
                        <dd className="mt-1 font-inter text-base text-foreground">
                          {loading ? (
                            <span className="inline-block h-5 w-40 animate-pulse rounded bg-muted" />
                          ) : (
                            displayName
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-inter text-sm font-medium text-muted-foreground">
                          Correo electrónico
                        </dt>
                        <dd className="mt-1 break-all font-inter text-base text-foreground">
                          {loading ? (
                            <span className="inline-block h-5 w-48 max-w-full animate-pulse rounded bg-muted" />
                          ) : (
                            email
                          )}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-inter text-sm font-medium text-muted-foreground">
                          Rol
                        </dt>
                        <dd className="mt-1 font-inter text-base text-foreground">
                          {loading ? (
                            <span className="inline-block h-5 w-32 animate-pulse rounded bg-muted" />
                          ) : (
                            role
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden lg:hidden">
        <CandidateTopbar variant="tablet" breadcrumbLabel="Mi perfil" />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 flex flex-col gap-5 p-4 md:gap-6 md:p-6">
            <section aria-labelledby="mi-perfil-titulo-mobile">
              <h1
                id="mi-perfil-titulo-mobile"
                className="font-inter text-xl font-bold text-foreground md:text-2xl"
              >
                Mi perfil
              </h1>
              <p className="mt-1 font-inter text-[13px] text-muted-foreground md:mt-1.5 md:text-sm">
                Datos de tu cuenta en ATS App
              </p>
            </section>

            <section
              className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6"
              aria-labelledby="mi-perfil-datos-mobile"
            >
              <div className="flex flex-col gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-vo-purple/10 text-vo-purple"
                  aria-hidden
                >
                  <UserCircle className="h-9 w-9" strokeWidth={1.5} />
                </div>
                <div>
                  <h2
                    id="mi-perfil-datos-mobile"
                    className="font-inter text-base font-semibold text-foreground md:text-lg"
                  >
                    Datos de la cuenta
                  </h2>
                  <dl className="mt-4 flex flex-col gap-4">
                    <div>
                      <dt className="font-inter text-xs font-medium text-muted-foreground md:text-sm">
                        Nombre
                      </dt>
                      <dd className="mt-1 font-inter text-sm text-foreground md:text-base">
                        {loading ? (
                          <span className="inline-block h-5 w-36 animate-pulse rounded bg-muted" />
                        ) : (
                          displayName
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-inter text-xs font-medium text-muted-foreground md:text-sm">
                        Correo electrónico
                      </dt>
                      <dd className="mt-1 break-all font-inter text-sm text-foreground md:text-base">
                        {loading ? (
                          <span className="inline-block h-5 w-full max-w-xs animate-pulse rounded bg-muted" />
                        ) : (
                          email
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-inter text-xs font-medium text-muted-foreground md:text-sm">
                        Rol
                      </dt>
                      <dd className="mt-1 font-inter text-sm text-foreground md:text-base">
                        {loading ? (
                          <span className="inline-block h-5 w-28 animate-pulse rounded bg-muted" />
                        ) : (
                          role
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
