"use client"

import { useCallback } from "react"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import { useCandidateSnackbar } from "@/components/candidato/candidate-portal-snackbar"
import { CandidateSelfProfileView } from "@/components/candidato/candidate-self-profile-view"
import { useCandidateProfile } from "@/hooks/useCandidateProfile"
import { useCandidateSelfProfile } from "@/hooks/useCandidateSelfProfile"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import type { CandidateProfileSaveBody } from "@/lib/candidate-profile"
import { AlertCircle, UserCircle } from "lucide-react"

const emptyDash = (value: string | null | undefined) =>
  value != null && String(value).trim() !== "" ? String(value) : "—"

export default function MiPerfilContent() {
  const { user, loading: userLoading } = useCurrentUser()
  const {
    profile: apiProfile,
    loading: apiLoading,
    error: apiError,
    notFound,
    save,
    saving,
    saveError,
    clearSaveError,
    refetch: refetchApiProfile,
  } = useCandidateProfile()
  const { profile: selfDto, loading: selfLoading, refetch: refetchSelf } =
    useCandidateSelfProfile()
  const { showSnackbar } = useCandidateSnackbar()

  const handleSaveProfile = useCallback(
    async (body: CandidateProfileSaveBody) => {
      try {
        await save(body)
        await refetchSelf()
        showSnackbar("Cambios guardados correctamente.", "success")
      } catch {
        showSnackbar("No se pudieron guardar los cambios. Reintentá.", "error")
      }
    },
    [save, refetchSelf, showSnackbar]
  )

  const handleRetryLoad = useCallback(() => {
    void refetchApiProfile()
    void refetchSelf()
  }, [refetchApiProfile, refetchSelf])

  const sessionCard = (
    <section
      className="rounded-2xl border border-dashed border-border bg-card/80 p-4 shadow-sm md:p-5"
      aria-labelledby="mi-perfil-sesion-titulo"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          aria-hidden
        >
          <UserCircle className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="mi-perfil-sesion-titulo"
            className="font-inter text-sm font-semibold text-foreground"
          >
            Tu sesión
          </h2>
          <p className="mt-1 font-inter text-xs text-muted-foreground">
            Datos básicos de acceso. El resto de la ficha se carga desde el servidor.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-inter text-xs font-medium text-muted-foreground">Nombre</dt>
              <dd className="mt-0.5 font-inter text-sm text-foreground">
                {userLoading ? (
                  <span className="inline-block h-4 w-32 animate-pulse rounded bg-muted" />
                ) : (
                  emptyDash(user?.name)
                )}
              </dd>
            </div>
            <div>
              <dt className="font-inter text-xs font-medium text-muted-foreground">Correo</dt>
              <dd className="mt-0.5 break-all font-inter text-sm text-foreground">
                {userLoading ? (
                  <span className="inline-block h-4 w-40 max-w-full animate-pulse rounded bg-muted" />
                ) : (
                  emptyDash(user?.email)
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-inter text-xs font-medium text-muted-foreground">Rol</dt>
              <dd className="mt-0.5 font-inter text-sm text-foreground">
                {userLoading ? (
                  <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  emptyDash(user?.role)
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )

  const showFatalError = apiError != null
  const showView = !apiLoading && !showFatalError && (notFound || apiProfile != null)

  const mainInner = (
    <div className="mx-auto w-full max-w-5xl pb-10">
      <header className="mb-6 md:mb-8">
        <h1 className="font-inter text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Mi perfil
        </h1>
        <p className="mt-2 max-w-2xl font-inter text-sm leading-relaxed text-muted-foreground md:text-base">
          Editá tu ficha con los datos obligatorios y revisá cómo se combina con la información de
          tus documentos.
        </p>
        {selfLoading && !apiLoading ? (
          <p className="mt-2 font-inter text-xs text-muted-foreground" aria-live="polite">
            Actualizando datos ampliados del CV…
          </p>
        ) : null}
      </header>

      {apiLoading ? (
        <div className="flex flex-col gap-6">
          {sessionCard}
          <div
            className="rounded-2xl border border-border bg-card p-6 text-center md:p-8"
            aria-live="polite"
          >
            <div
              className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
              aria-hidden
            />
            <p className="mt-4 font-inter text-sm font-medium text-foreground">
              Cargando tu perfil…
            </p>
            <p className="mt-1 font-inter text-xs text-muted-foreground">
              Obteniendo datos desde el servidor.
            </p>
          </div>
        </div>
      ) : null}

      {showFatalError ? (
        <div className="flex flex-col gap-6">
          {sessionCard}
          <div
            className="flex flex-col gap-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-5 md:flex-row md:items-start md:gap-5 md:p-6"
            role="alert"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive"
              aria-hidden
            >
              <AlertCircle className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-inter text-base font-semibold text-foreground">
                No pudimos cargar tu perfil
              </h2>
              <p className="mt-2 font-inter text-sm leading-relaxed text-muted-foreground">
                {apiError.message}
              </p>
              <button
                type="button"
                onClick={handleRetryLoad}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-vo-purple px-4 py-2.5 font-inter text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showView ? (
        <CandidateSelfProfileView
          candidateProfile={apiProfile}
          selfProfile={selfDto}
          profileNotFound={notFound}
          sessionRole={user?.role}
          onSaveProfile={handleSaveProfile}
          savingProfile={saving}
          saveProfileError={saveError}
          clearSaveProfileError={clearSaveError}
        />
      ) : null}
    </div>
  )

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <CandidateSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/15">
          <CandidateTopbar variant="desktop" breadcrumbLabel="Mi perfil" />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 px-4 py-6 md:px-8 md:py-8">{mainInner}</div>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden bg-muted/15 lg:hidden">
        <CandidateTopbar variant="tablet" breadcrumbLabel="Mi perfil" />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 px-4 py-5 md:px-6 md:py-6">{mainInner}</div>
        </main>
      </div>
    </div>
  )
}
