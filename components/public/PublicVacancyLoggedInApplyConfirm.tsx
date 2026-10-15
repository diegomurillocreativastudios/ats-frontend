"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { FileText } from "lucide-react"
import {
  ConsentAuthorizationModal,
  type ConsentAuthorizationInitialValues,
  type ConsentAuthorizationSubmitPayload,
} from "@/components/candidato/consent-authorization-modal"
import {
  PublicApplicationSubmitProgress,
  applySubmitProgressPanelClass,
} from "@/components/public/public-application-submit-progress"
import { downloadCandidateProfileCvAsFile } from "@/lib/candidate-profile-cv"
import { getApiErrorCode } from "@/lib/candidate-auth-consent"
import type { CandidateProfile } from "@/lib/candidate-profile"
import {
  APPLY_LOADING_TICK_MS,
  APPLY_LONG_WAIT_HINT_MS,
  getLoadingBarPercent,
} from "@/lib/apply-loading-bar"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"
import {
  getCvOutputLanguageErrorKind,
  toCvOutputLanguage,
} from "@/lib/cv-output-language"
import { PORTAL_HOME_HREF } from "@/lib/portal-access"
import {
  getPublicApplyErrorMessage,
  isAllowedCvFile,
  isAlreadyAppliedConflict,
  isAuthConsentRequiredError,
  isCvFileWithinSizeLimit,
  submitPublicVacancyApplication,
  type PublicVacancyApplyValues,
} from "@/lib/public-vacancy-apply"
import { mapCandidateProfileToApplyFields } from "@/lib/public-vacancy-apply-from-profile"

export function PublicVacancyLoggedInApplyConfirm({
  vacancyId,
  profile,
  hasCurrentConsent,
  onEditDetails,
}: {
  vacancyId: string
  profile: CandidateProfile
  hasCurrentConsent: boolean
  onEditDetails: () => void
}) {
  const t = useTranslations("PublicOpportunities.apply.loggedIn")
  const tForm = useTranslations("PublicOpportunities.applicationForm")
  const tCvLanguage = useTranslations("CvOutputLanguage")
  const outputLanguage = toCvOutputLanguage(useLocale())
  const fields = useMemo(
    () => mapCandidateProfileToApplyFields(profile),
    [profile]
  )

  const [submitPhase, setSubmitPhase] = useState<"idle" | "loading" | "success">(
    "idle"
  )
  const [loadingOverlay, setLoadingOverlay] = useState({
    percent: 0,
    longWait: false,
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [showAlreadyAppliedLink, setShowAlreadyAppliedLink] = useState(false)
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0)
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false)
  const loadingStartedAtRef = useRef(0)

  useEffect(() => {
    if (submitPhase !== "loading") return
    loadingStartedAtRef.current = Date.now()
    const tick = () => {
      const elapsedMs = Date.now() - loadingStartedAtRef.current
      setLoadingOverlay({
        percent: getLoadingBarPercent(elapsedMs),
        longWait: elapsedMs >= APPLY_LONG_WAIT_HINT_MS,
      })
    }
    tick()
    const id = window.setInterval(tick, APPLY_LOADING_TICK_MS)
    return () => window.clearInterval(id)
  }, [submitPhase])

  useEffect(() => {
    if (rateLimitSecondsLeft <= 0) return
    const id = window.setInterval(() => {
      setRateLimitSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [rateLimitSecondsLeft])

  const executeSubmit = useCallback(
    async (authConsent?: ConsentAuthorizationSubmitPayload) => {
      setSubmitPhase("loading")
      setLoadingOverlay({ percent: 0, longWait: false })
      setServerError(null)
      setShowAlreadyAppliedLink(false)

      try {
        const cvFile = await downloadCandidateProfileCvAsFile()
        if (!isAllowedCvFile(cvFile)) {
          setSubmitPhase("idle")
          setServerError(tForm("validation.fileType"))
          return
        }
        if (!isCvFileWithinSizeLimit(cvFile)) {
          setSubmitPhase("idle")
          setServerError(tForm("validation.fileTooLarge"))
          return
        }

        if (!fields.documentTypeId.trim() || !fields.nationalId.trim()) {
          setSubmitPhase("idle")
          setServerError(tForm("validation.documentTypeRequired"))
          return
        }

        const payload: PublicVacancyApplyValues = {
          firstName: fields.firstName,
          lastName: fields.lastName,
          email: fields.email,
          phone: fields.phone,
          documentTypeId: fields.documentTypeId,
          nationalId: fields.nationalId,
          linkedinUrl: fields.linkedinUrl,
          websiteUrl: fields.websiteUrl,
          cvFile,
          ...(authConsent ? { authConsent } : {}),
        }

        await submitPublicVacancyApplication(vacancyId, payload, outputLanguage)
        setSubmitPhase("success")
      } catch (err: unknown) {
        setSubmitPhase("idle")
        const status =
          typeof err === "object" && err !== null && "status" in err
            ? Number((err as { status?: number }).status)
            : 0
        const body =
          typeof err === "object" && err !== null && "body" in err
            ? (err as { body?: unknown }).body
            : undefined
        const retryAfter =
          typeof err === "object" && err !== null && "retryAfter" in err
            ? Number((err as { retryAfter?: number }).retryAfter)
            : undefined

        const cvLanguageError = getCvOutputLanguageErrorKind(err)
        if (cvLanguageError) {
          setServerError(tCvLanguage(cvLanguageError))
          return
        }

        const consentCode = getApiErrorCode(err)
        if (
          consentCode === "AUTH_CONSENT_REQUIRED" ||
          isAuthConsentRequiredError(status, body)
        ) {
          setServerError(tForm("validation.consentRequired"))
          setIsConsentModalOpen(true)
          return
        }
        if (consentCode === "AUTH_CONSENT_VERSION_MISMATCH") {
          setServerError(tForm("validation.consentVersionMismatch"))
          return
        }
        if (consentCode === "AUTH_CONSENT_NATIONAL_ID_CONFLICT") {
          setServerError(tForm("validation.consentNationalIdConflict"))
          return
        }
        if (consentCode === "AUTH_CONSENT_VALIDATION") {
          setServerError(tForm("validation.consentValidation"))
          return
        }

        const apiMessage = getPublicApplyErrorMessage(status, body)
        const fallbackMessage =
          err instanceof Error && err.message.trim() !== ""
            ? err.message.trim()
            : ""
        if (
          status === 400 &&
          /documentType|tipo de documento/i.test(
            `${apiMessage} ${fallbackMessage}`
          )
        ) {
          setServerError(tForm("validation.documentTypeRequired"))
          return
        }

        if (isAlreadyAppliedConflict(status, body)) {
          setServerError(tForm("validation.alreadyApplied"))
          setShowAlreadyAppliedLink(true)
          return
        }

        if (status === 404) {
          setServerError(tForm("validation.vacancyUnavailable"))
          return
        }

        if (status === 429) {
          const seconds = parseRetryAfterSeconds(
            retryAfter != null && Number.isFinite(retryAfter)
              ? String(retryAfter)
              : null
          )
          setRateLimitSecondsLeft(seconds)
          setServerError(
            apiMessage ||
              tForm("validation.rateLimited", { seconds: String(seconds) })
          )
          return
        }

        if (status === 0 && err instanceof Error && err.message) {
          setServerError(err.message || t("cvDownloadFailed"))
          return
        }

        setServerError(apiMessage || t("submitFailed"))
      }
    },
    [
      fields.documentTypeId,
      fields.email,
      fields.firstName,
      fields.lastName,
      fields.linkedinUrl,
      fields.nationalId,
      fields.phone,
      fields.websiteUrl,
      outputLanguage,
      t,
      tCvLanguage,
      tForm,
      vacancyId,
    ]
  )

  const handlePrimaryClick = useCallback(() => {
    if (submitPhase === "loading" || rateLimitSecondsLeft > 0) return
    setServerError(null)
    if (hasCurrentConsent) {
      void executeSubmit()
      return
    }
    setIsConsentModalOpen(true)
  }, [executeSubmit, hasCurrentConsent, rateLimitSecondsLeft, submitPhase])

  const consentInitialValues = useMemo<ConsentAuthorizationInitialValues>(
    () => ({
      firstNames: fields.firstName,
      lastNames: fields.lastName,
      documentId: fields.nationalId,
      email: fields.email,
      phone: fields.phone,
      phoneCountryIso2: fields.phoneCountryIso2,
    }),
    [fields]
  )

  const handleAcceptConsent = useCallback(
    async (payload: ConsentAuthorizationSubmitPayload) => {
      setIsConsentModalOpen(false)
      await executeSubmit(payload)
    },
    [executeSubmit]
  )

  if (submitPhase === "success") {
    return (
      <div className="space-y-6">
        <div
          className={applySubmitProgressPanelClass("light")}
          role="status"
          aria-live="polite"
        >
          <PublicApplicationSubmitProgress mode="success" theme="light" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/portal-oportunidades"
            className="inline-flex items-center justify-center rounded-lg bg-ats-terracotta px-5 py-2.5 text-sm font-medium text-ats-warm-white hover:opacity-95"
          >
            {tForm("actions.backToList")}
          </Link>
        </div>
      </div>
    )
  }

  const disabled = submitPhase === "loading" || rateLimitSecondsLeft > 0
  const showProgressOverlay = submitPhase === "loading"
  const fullName = `${fields.firstName} ${fields.lastName}`.trim()

  return (
    <div className="relative">
      {showProgressOverlay ? (
        <div className={applySubmitProgressPanelClass("light", { absolute: true })}>
          <PublicApplicationSubmitProgress
            mode="loading"
            theme="light"
            loadingBarPercent={loadingOverlay.percent}
            showLongWaitHint={loadingOverlay.longWait}
          />
        </div>
      ) : null}

      <div
        aria-busy={showProgressOverlay}
        className={`space-y-6 transition-opacity duration-200 ${showProgressOverlay ? "pointer-events-none select-none opacity-[0.38] blur-[0.5px]" : ""}`}
      >
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {t("sectionLabel")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("body")}
          </p>
        </div>

        {serverError ? (
          <div className="space-y-2" role="alert">
            <p className="text-sm text-destructive">{serverError}</p>
            {showAlreadyAppliedLink ? (
              <Link
                href={PORTAL_HOME_HREF.candidate}
                className="inline-flex text-sm font-medium text-ats-cobre underline-offset-4 hover:underline"
              >
                {tForm("validation.alreadyAppliedCta")}
              </Link>
            ) : null}
          </div>
        ) : null}

        <dl className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t("fields.name")}</dt>
            <dd className="mt-0.5 font-medium text-foreground">{fullName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("fields.email")}</dt>
            <dd className="mt-0.5 font-medium text-foreground break-all">
              {fields.email}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("fields.phone")}</dt>
            <dd className="mt-0.5 font-medium text-foreground">{fields.phone}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("fields.document")}</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {fields.nationalId}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{t("fields.cv")}</dt>
            <dd className="mt-1 inline-flex items-center gap-2 font-medium text-foreground">
              <FileText className="h-4 w-4 text-ats-terracotta" aria-hidden />
              {t("cvOnFile")}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handlePrimaryClick}
            disabled={disabled}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ats-terracotta px-5 py-2.5 text-sm font-medium text-ats-warm-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rateLimitSecondsLeft > 0
              ? tForm("validation.rateLimited", {
                  seconds: String(rateLimitSecondsLeft),
                })
              : t("cta")}
          </button>
          <button
            type="button"
            onClick={onEditDetails}
            disabled={disabled}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("editDetails")}
          </button>
        </div>
      </div>

      <ConsentAuthorizationModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onAccept={handleAcceptConsent}
        initialValues={consentInitialValues}
        variant="public"
        isDismissible
      />
    </div>
  )
}
