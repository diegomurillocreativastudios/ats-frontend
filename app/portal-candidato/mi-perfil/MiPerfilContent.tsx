"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import AgregarCandidatoModal from "@/components/candidato/AgregarCandidatoModal"
import CandidateSidebar from "@/components/candidato/CandidateSidebar"
import CandidateTopbar from "@/components/candidato/CandidateTopbar"
import { useCandidateSnackbar } from "@/components/candidato/candidate-portal-snackbar"
import { CandidateSelfProfileView } from "@/components/candidato/candidate-self-profile-view"
import {
  ConsentAuthorizationModal,
  type ConsentAuthorizationSubmitPayload,
} from "@/components/candidato/consent-authorization-modal"
import { useCandidateProfile } from "@/hooks/useCandidateProfile"
import { useCandidateSelfProfile } from "@/hooks/useCandidateSelfProfile"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import {
  fetchCandidateAuthConsentStatus,
  mapCandidateAuthConsentError,
  submitCandidateAuthConsent,
  type CandidateAuthConsentStatus,
} from "@/lib/candidate-auth-consent"
import type { CandidateProfileSaveBody } from "@/lib/candidate-profile"
import { AlertCircle, FileText, UserCircle } from "lucide-react"

const emptyDash = (value: string | null | undefined) =>
  value != null && String(value).trim() !== "" ? String(value) : "—"

export default function MiPerfilContent() {
  const t = useTranslations("CandidatePortal.profile")
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
  const [isCompleteInformationModalOpen, setIsCompleteInformationModalOpen] =
    useState(false)
  const [isConsentOpen, setIsConsentOpen] = useState(false)
  const [consentStatus, setConsentStatus] =
    useState<CandidateAuthConsentStatus | null>(null)

  useEffect(() => {
    if (apiLoading) return
    if (notFound || apiProfile == null) {
      setIsConsentOpen(false)
      return
    }

    let cancelled = false
    const loadConsentStatus = async () => {
      try {
        const status = await fetchCandidateAuthConsentStatus()
        if (cancelled) return
        setConsentStatus(status)
        setIsConsentOpen(status.requiresReacceptance === true)
      } catch {
        if (cancelled) return
        // Fallback: profile flag from GET /api/candidate/profile
        setConsentStatus(null)
        setIsConsentOpen(apiProfile.authAndConsentVerification !== true)
      }
    }

    void loadConsentStatus()
    return () => {
      cancelled = true
    }
  }, [
    apiLoading,
    notFound,
    apiProfile?.id,
    apiProfile?.authAndConsentVerification,
  ])

  const handleSaveProfile = useCallback(
    async (body: CandidateProfileSaveBody) => {
      try {
        await save(body)
        await refetchSelf()
        showSnackbar(t("toasts.saveSuccess"), "success")
      } catch {
        showSnackbar(t("toasts.saveError"), "error")
      }
    },
    [save, refetchSelf, showSnackbar, t]
  )

  const handleRetryLoad = useCallback(() => {
    void refetchApiProfile()
    void refetchSelf()
  }, [refetchApiProfile, refetchSelf])

  const handleSnackbarFromModal = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      showSnackbar(message, variant)
    },
    [showSnackbar]
  )

  const handleCompleteInformationSuccess = useCallback(() => {
    void Promise.all([refetchApiProfile(), refetchSelf()])
  }, [refetchApiProfile, refetchSelf])

  const handleOpenCompleteInformation = useCallback(() => {
    setIsCompleteInformationModalOpen(true)
  }, [])

  const handleCloseCompleteInformation = useCallback(() => {
    setIsCompleteInformationModalOpen(false)
  }, [])

  const handleCloseConsent = useCallback(() => {
    // Consent is required until verified; allow dismiss only if already verified.
    if (
      apiProfile?.authAndConsentVerification === true &&
      consentStatus?.requiresReacceptance !== true
    ) {
      setIsConsentOpen(false)
    }
  }, [apiProfile?.authAndConsentVerification, consentStatus?.requiresReacceptance])

  const handleAcceptConsent = useCallback(
    async (payload: ConsentAuthorizationSubmitPayload) => {
      try {
        const result = await submitCandidateAuthConsent(payload)
        setConsentStatus({
          authAndConsentVerification: result.authAndConsentVerification,
          authAndConsentVerifiedAt: result.authAndConsentVerifiedAt,
          currentDocumentVersion: result.documentVersion,
          acceptedDocumentVersion: result.documentVersion,
          requiresReacceptance: !result.authAndConsentVerification,
        })
        setIsConsentOpen(false)
        await Promise.all([refetchApiProfile(), refetchSelf()])
        showSnackbar(t("consent.toasts.submitSuccess"), "success")
      } catch (err) {
        const mapped = mapCandidateAuthConsentError(err)
        if (mapped.code === "AUTH_CONSENT_VERSION_MISMATCH") {
          showSnackbar(t("consent.toasts.versionMismatch"), "error")
          return
        }
        if (mapped.code === "AUTH_CONSENT_NATIONAL_ID_CONFLICT") {
          showSnackbar(t("consent.toasts.nationalIdConflict"), "error")
          return
        }
        if (mapped.code === "AUTH_CONSENT_PROFILE_NOT_FOUND") {
          showSnackbar(t("consent.toasts.profileNotFound"), "error")
          return
        }
        if (mapped.code === "AUTH_CONSENT_FORBIDDEN") {
          showSnackbar(t("consent.toasts.forbidden"), "error")
          return
        }
        if (mapped.code === "AUTH_CONSENT_VALIDATION") {
          showSnackbar(
            mapped.message || t("consent.toasts.validation"),
            "error"
          )
          return
        }
        showSnackbar(mapped.message || t("consent.toasts.submitError"), "error")
      }
    },
    [refetchApiProfile, refetchSelf, showSnackbar, t]
  )

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
            className="font-sans text-sm font-semibold text-foreground"
          >
            {t("session.title")}
          </h2>
          <p className="mt-1 font-sans text-xs text-muted-foreground">
            {t("session.description")}
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-sans text-xs font-medium text-muted-foreground">{t("session.name")}</dt>
              <dd className="mt-0.5 font-sans text-sm text-foreground">
                {userLoading ? (
                  <span className="inline-block h-4 w-32 animate-pulse rounded bg-muted" />
                ) : (
                  emptyDash(user?.name)
                )}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-medium text-muted-foreground">{t("session.email")}</dt>
              <dd className="mt-0.5 break-all font-sans text-sm text-foreground">
                {userLoading ? (
                  <span className="inline-block h-4 w-40 max-w-full animate-pulse rounded bg-muted" />
                ) : (
                  emptyDash(user?.email)
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-sans text-xs font-medium text-muted-foreground">{t("session.role")}</dt>
              <dd className="mt-0.5 font-sans text-sm text-foreground">
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
  const isConsentRequired =
    apiProfile != null &&
    (consentStatus?.requiresReacceptance === true ||
      apiProfile.authAndConsentVerification !== true)

  const mainInner = (
    <div className="mx-auto w-full max-w-7xl pb-10">
      <header className="mb-6 md:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t("page.title")}
          </h1>
          <button
            type="button"
            onClick={handleOpenCompleteInformation}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-vo-purple px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 sm:px-5 sm:py-2.5"
            aria-label={t("completeInfoAria")}
          >
            <FileText className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline" aria-hidden>
              {t("completeInfo")}
            </span>
            <span className="sm:hidden" aria-hidden>
              {t("completeInfoShort")}
            </span>
          </button>
        </div>
        <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground md:text-base">
          {t("page.description")}
        </p>
        {selfLoading && !apiLoading ? (
          <p className="mt-2 font-sans text-xs text-muted-foreground" aria-live="polite">
            {t("page.refreshingCv")}
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
            <p className="mt-4 font-sans text-sm font-medium text-foreground">
              {t("page.loadingTitle")}
            </p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              {t("page.loadingDescription")}
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
              <h2 className="font-sans text-base font-semibold text-foreground">
                {t("page.errorTitle")}
              </h2>
              <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                {apiError.message}
              </p>
              <button
                type="button"
                onClick={handleRetryLoad}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-vo-purple px-4 py-2.5 font-sans text-sm font-medium text-white transition-colors hover:bg-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2"
              >
                {t("page.retry")}
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
          onCompleteInformation={handleOpenCompleteInformation}
        />
      ) : null}
    </div>
  )

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground">
      <div className="hidden h-full lg:flex">
        <CandidateSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/15">
          <CandidateTopbar variant="desktop" breadcrumbLabel={t("breadcrumb")} />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="min-w-0 px-4 py-6 md:px-8 md:py-8">{mainInner}</div>
          </main>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-col overflow-hidden bg-muted/15 lg:hidden">
        <CandidateTopbar variant="tablet" breadcrumbLabel={t("breadcrumb")} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 px-4 py-5 md:px-6 md:py-6">{mainInner}</div>
        </main>
      </div>

      <ConsentAuthorizationModal
        isOpen={isConsentOpen}
        onClose={handleCloseConsent}
        onAccept={handleAcceptConsent}
        initialEmail={user?.email ?? apiProfile?.email}
        isDismissible={!isConsentRequired}
      />

      <AgregarCandidatoModal
        variant="self"
        isOpen={isCompleteInformationModalOpen}
        onClose={handleCloseCompleteInformation}
        onSuccess={handleCompleteInformationSuccess}
        onSnackbar={handleSnackbarFromModal}
      />
    </div>
  )
}
