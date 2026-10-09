"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { ApplyPrivacyNoticeDialog } from "@/components/public/ApplyPrivacyNoticeDialog"
import { PublicVacancyApplicationForm } from "@/components/public/PublicVacancyApplicationForm"
import { PublicVacancyLoggedInApplyConfirm } from "@/components/public/PublicVacancyLoggedInApplyConfirm"
import { PublicOpportunitiesShell } from "@/components/public/PublicOpportunitiesShell"
import { PublicVacancyUnavailable } from "@/components/public/PublicVacancyUnavailable"
import { ApplicationTipsWidget } from "@/components/public/ApplicationTipsWidget"
import { VacancyIdentityFacts } from "@/components/public/vacancy-identity-facts"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import {
  getPublicVacancyByPathSegment,
  type OpportunityVacancyDetail,
} from "@/lib/api/public-vacancies"
import {
  fetchCandidateAuthConsentStatus,
  type CandidateAuthConsentStatus,
} from "@/lib/candidate-auth-consent"
import {
  normalizeCandidateProfileFromApi,
  type CandidateProfile,
} from "@/lib/candidate-profile"
import { apiClient } from "@/lib/api"
import { hasVacancyFieldValue } from "@/lib/public-vacancy-content"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"
import { fetchCandidateApplicationByVacancy } from "@/lib/candidate-application-by-vacancy"
import { PORTAL_HOME_HREF } from "@/lib/portal-access"
import {
  isApplyConsentCurrent,
  isProfileReadyForQuickApply,
  mapCandidateProfileToApplyFields,
} from "@/lib/public-vacancy-apply-from-profile"
import { isCandidateRole } from "@/lib/roles"
import { buildPublicVacancyPath } from "@/lib/vacancies/vacancy-public-path"

const applyIllustrationSrc = "/ilustrations/undraw_contract-signed_vutk.svg"

function VacancyApplySkeleton() {
  return (
    <div className={publicOpportunitiesTheme.applyGrid}>
      <div className="space-y-3">
        <div className="h-5 w-24 rounded-md bg-muted/50" />
        <div className="h-10 w-full rounded-md bg-muted/50" />
        <div className="h-4 w-4/5 rounded-md bg-muted/50" />
        <div className="h-4 w-3/5 rounded-md bg-muted/50" />
      </div>
      <div className="space-y-4">
        <div className="h-8 w-64 rounded-md bg-muted/50" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-11 rounded-lg bg-muted/50" />
          <div className="h-11 rounded-lg bg-muted/50" />
          <div className="h-11 rounded-lg bg-muted/50" />
        </div>
      </div>
    </div>
  )
}

type CandidateApplyMode = "confirm" | "prefill" | "guest"

export function PublicVacancyApplyPage({ vacancyId }: { vacancyId: string }) {
  const t = useTranslations("PublicOpportunities.apply")
  const tPage = useTranslations("PublicOpportunities.page")
  const tDetail = useTranslations("PublicOpportunities.detail")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: isAuthLoading } = useCurrentUser()
  const isCandidate = Boolean(user && isCandidateRole(user.role))

  const [vacancy, setVacancy] = useState<OpportunityVacancyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false)
  const [isUnavailable, setIsUnavailable] = useState(false)

  const [candidateProfile, setCandidateProfile] =
    useState<CandidateProfile | null>(null)
  const [consentStatus, setConsentStatus] =
    useState<CandidateAuthConsentStatus | null>(null)
  const [isCandidateDataLoading, setIsCandidateDataLoading] = useState(false)
  const [forcePrefillForm, setForcePrefillForm] = useState(false)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const [isAlreadyAppliedLoading, setIsAlreadyAppliedLoading] = useState(false)

  const queryString = searchParams.toString()
  const opportunitiesHref = queryString
    ? `/portal-oportunidades?${queryString}`
    : "/portal-oportunidades"
  const backToDetailHref = vacancy
    ? queryString
      ? `${buildPublicVacancyPath(vacancy)}?${queryString}`
      : buildPublicVacancyPath(vacancy)
    : queryString
      ? `/portal-oportunidades/${encodeURIComponent(vacancyId)}?${queryString}`
      : `/portal-oportunidades/${encodeURIComponent(vacancyId)}`

  useEffect(() => {
    let isCancelled = false

    async function loadVacancy() {
      setIsLoading(true)
      setErrorMessage(null)
      setIsUnavailable(false)

      try {
        const nextVacancy = await getPublicVacancyByPathSegment(vacancyId)
        if (isCancelled) return

        if (!nextVacancy) {
          setVacancy(null)
          setIsUnavailable(true)
          return
        }

        setVacancy(nextVacancy)

        const canonical = nextVacancy.publicSlug
        if (canonical && vacancyId !== canonical) {
          const nextPath = buildPublicVacancyPath(nextVacancy, "aplicar")
          const withQuery = queryString ? `${nextPath}?${queryString}` : nextPath
          router.replace(withQuery)
        }
      } catch (error) {
        if (isCancelled) return
        const message =
          error instanceof Error && error.message.trim() !== ""
            ? error.message
            : t("loadFailed")
        setVacancy(null)
        setErrorMessage(message)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadVacancy()

    return () => {
      isCancelled = true
    }
  }, [t, vacancyId, router, queryString])

  useEffect(() => {
    if (isAuthLoading) return
    if (!isCandidate) {
      setCandidateProfile(null)
      setConsentStatus(null)
      setIsCandidateDataLoading(false)
      setForcePrefillForm(false)
      setAlreadyApplied(false)
      setIsAlreadyAppliedLoading(false)
      return
    }

    let isCancelled = false

    async function loadCandidateApplyData() {
      setIsCandidateDataLoading(true)
      try {
        const [profileRaw, consent] = await Promise.all([
          apiClient.get("/api/candidate/profile"),
          fetchCandidateAuthConsentStatus().catch(() => null),
        ])
        if (isCancelled) return
        setCandidateProfile(normalizeCandidateProfileFromApi(profileRaw))
        setConsentStatus(consent)
      } catch {
        if (isCancelled) return
        setCandidateProfile(null)
        setConsentStatus(null)
      } finally {
        if (!isCancelled) {
          setIsCandidateDataLoading(false)
        }
      }
    }

    void loadCandidateApplyData()

    return () => {
      isCancelled = true
    }
  }, [isAuthLoading, isCandidate])

  useEffect(() => {
    if (isAuthLoading || !isCandidate || !vacancy?.id) {
      setAlreadyApplied(false)
      setIsAlreadyAppliedLoading(false)
      return
    }

    const vacancyGuid = vacancy.id
    let isCancelled = false
    setIsAlreadyAppliedLoading(true)

    void (async () => {
      try {
        const status = await fetchCandidateApplicationByVacancy(vacancyGuid)
        if (isCancelled) return
        setAlreadyApplied(status.hasApplied)
      } catch {
        if (isCancelled) return
        // Fail open: allow apply UI; submit still maps 409 ALREADY_APPLIED.
        setAlreadyApplied(false)
      } finally {
        if (!isCancelled) {
          setIsAlreadyAppliedLoading(false)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [isAuthLoading, isCandidate, vacancy?.id])

  useEffect(() => {
    if (!vacancy?.title) return
    document.title = t("documentTitle", { title: vacancy.title })
  }, [t, vacancy?.title])

  const applyMode: CandidateApplyMode = useMemo(() => {
    if (isAuthLoading || (isCandidate && isCandidateDataLoading)) {
      return "guest"
    }
    if (!isCandidate) return "guest"
    if (forcePrefillForm) return "prefill"
    if (isProfileReadyForQuickApply(candidateProfile)) return "confirm"
    return "prefill"
  }, [
    isAuthLoading,
    isCandidate,
    isCandidateDataLoading,
    forcePrefillForm,
    candidateProfile,
  ])

  const isLoggedInCandidateBranch = isCandidate && !isAuthLoading
  const showPrivacyDialog =
    !isLoggedInCandidateBranch &&
    Boolean(vacancy && !errorMessage && !isLoading && !hasAcceptedPrivacy)

  const companyName = vacancy?.company.name?.trim() ?? ""
  const departmentLabel = vacancy?.department?.displayName
  const hasDepartment = hasVacancyFieldValue(departmentLabel)

  const prefillValues = useMemo(() => {
    const accountEmail = user?.email?.trim() ?? ""
    if (!candidateProfile) {
      if (!accountEmail) return null
      return {
        firstName: "",
        lastName: "",
        email: accountEmail,
        phone: "",
        phoneCountryIso2: "SV",
        documentTypeId: "",
        nationalId: "",
        linkedinUrl: "",
        websiteUrl: "",
      }
    }
    const mapped = mapCandidateProfileToApplyFields(candidateProfile)
    if (!mapped.email && accountEmail) {
      return { ...mapped, email: accountEmail }
    }
    return mapped
  }, [candidateProfile, user?.email])

  const lockedEmail =
    applyMode === "prefill" && Boolean(prefillValues?.email?.trim())

  const isSessionBootstrapping =
    isAuthLoading || (isCandidate && isCandidateDataLoading)
  const isApplyActionBootstrapping =
    isCandidate && Boolean(vacancy?.id) && isAlreadyAppliedLoading

  const checklistItems =
    applyMode === "confirm"
      ? ([
          t("loggedIn.checklistProfile"),
          t("loggedIn.checklistCv"),
          t("loggedIn.checklistReview"),
        ] as const)
      : applyMode === "prefill"
        ? ([
            t("loggedIn.checklistComplete"),
            t("loggedIn.checklistCvUpload"),
            t("checklistEmail"),
          ] as const)
        : ([t("checklistCv"), t("checklistEmail"), t("checklistData")] as const)

  const formSectionLabel =
    applyMode === "confirm"
      ? t("loggedIn.sectionLabel")
      : applyMode === "prefill"
        ? t("loggedIn.formSectionLabel")
        : t("formSectionLabel")

  return (
    <PublicOpportunitiesShell
      isChromeInert={showPrivacyDialog}
      background={
        <>
          <div className={publicOpportunitiesTheme.heroGradientShort} />
          <div
            className={`absolute right-[6%] top-12 h-56 w-56 ${publicOpportunitiesTheme.orbCobre}`}
          />
        </>
      }
      overlays={
        showPrivacyDialog ? (
          <ApplyPrivacyNoticeDialog
            isOpen
            onAccept={() => setHasAcceptedPrivacy(true)}
            onDecline={() => router.push("/portal-oportunidades")}
          />
        ) : null
      }
    >
      <div className="relative flex w-full flex-col px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <div className={publicOpportunitiesTheme.shellDirectory}>
          {isUnavailable ? null : (
            <div className="mb-8">
              <Link
                href={backToDetailHref}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t("backToDetail")}
              </Link>
            </div>
          )}

          {isUnavailable ? (
            <PublicVacancyUnavailable href={opportunitiesHref} />
          ) : errorMessage ? (
            <p className="text-sm text-ats-terracotta-soft" role="alert">
              {errorMessage}
            </p>
          ) : isLoading || !vacancy || isSessionBootstrapping ? (
            <VacancyApplySkeleton />
          ) : (
            <div className={publicOpportunitiesTheme.applyGrid}>
              <aside
                className={publicOpportunitiesTheme.directoryRail}
                aria-labelledby="apply-rail-heading"
              >
                <div
                  className={publicOpportunitiesTheme.applyIllustrationFrame}
                  aria-hidden
                >
                  <img
                    src={applyIllustrationSrc}
                    alt=""
                    className={publicOpportunitiesTheme.applyIllustrationImage}
                  />
                </div>
                <p
                  id="apply-rail-heading"
                  className="text-sm font-medium text-muted-foreground"
                >
                  {t("applyBadge")}
                </p>

                <VacancyIdentityFacts
                  companyName={companyName}
                  countryCode={vacancy.countryCode}
                  stateCode={vacancy.stateCode}
                  emptyLocationLabel={tPage("fallbackLocation")}
                  showLocation
                  departmentLabel={hasDepartment ? departmentLabel : null}
                  modalityLabel={
                    vacancy.modality?.displayName ?? tDetail("unspecified")
                  }
                  laws={vacancy.dataProtectionLaws}
                  lawsLabel={tDetail("lawsLabel")}
                />

                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">
                    {applyMode === "guest"
                      ? t("beforeSubmit")
                      : t("loggedIn.beforeSubmit")}
                  </p>
                  <ul className="mt-3 space-y-2.5 text-sm leading-6 text-muted-foreground">
                    {checklistItems.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-ats-cobre"
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <ApplicationTipsWidget variant="inline" />
              </aside>

              <section aria-labelledby="apply-vacancy-title">
                <h1
                  id="apply-vacancy-title"
                  className={publicOpportunitiesTheme.articleTitle}
                >
                  {vacancy.title}
                </h1>
                <p className="mt-6 text-sm font-medium text-muted-foreground">
                  {formSectionLabel}
                </p>

                <div className="mt-6">
                  {isApplyActionBootstrapping ? (
                    <div className="space-y-3" aria-busy="true">
                      <div className="h-8 w-2/3 rounded-md bg-muted/50" />
                      <div className="h-24 w-full rounded-md bg-muted/50" />
                    </div>
                  ) : alreadyApplied ? (
                    <div
                      className="rounded-xl border border-ats-cobre/30 bg-ats-cobre/5 p-6"
                      role="status"
                    >
                      <h2 className="text-lg font-semibold text-foreground">
                        {t("alreadyApplied.title")}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {t("alreadyApplied.body")}
                      </p>
                      <Link
                        href={PORTAL_HOME_HREF.candidate}
                        className="mt-5 inline-flex items-center justify-center rounded-lg bg-ats-cobre px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ats-cobre/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2"
                      >
                        {t("alreadyApplied.cta")}
                      </Link>
                    </div>
                  ) : applyMode === "confirm" && candidateProfile ? (
                    <PublicVacancyLoggedInApplyConfirm
                      vacancyId={vacancy.id}
                      profile={candidateProfile}
                      hasCurrentConsent={isApplyConsentCurrent(consentStatus)}
                      onEditDetails={() => setForcePrefillForm(true)}
                    />
                  ) : (
                    <PublicVacancyApplicationForm
                      vacancyId={vacancy.id}
                      theme="light"
                      initialValues={
                        applyMode === "prefill" ? prefillValues : null
                      }
                      isEmailLocked={lockedEmail}
                      skipEmailConfirmation={applyMode === "prefill"}
                    />
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </PublicOpportunitiesShell>
  )
}
