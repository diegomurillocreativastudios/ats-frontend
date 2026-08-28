"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2, FileText, LoaderCircle, Mail, X } from "lucide-react"
import {
  getPublicApplyErrorMessage,
  isAllowedCvFile,
  isCvFileWithinSizeLimit,
  isValidEmailFormat,
  parsePublicApplyFieldErrors,
  submitPublicVacancyApplication,
  type PublicVacancyApplyValues,
} from "@/lib/public-vacancy-apply"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"
import {
  APPLY_LOADING_TICK_MS,
  APPLY_LONG_WAIT_HINT_MS,
  getLoadingBarPercent,
} from "@/lib/apply-loading-bar"
import { ApplyStyleProgressBar } from "@/components/public/apply-style-progress-bar"
import { ApplyEmailConfirmationModal } from "@/components/public/ApplyEmailConfirmationModal"
import {
  ConsentAuthorizationModal,
  type ConsentAuthorizationInitialValues,
  type ConsentAuthorizationSubmitPayload,
} from "@/components/candidato/consent-authorization-modal"
import { getApiErrorCode } from "@/lib/candidate-auth-consent"
import {
  listIdentityDocumentTypes,
  type IdentityDocumentTypeOptionDto,
} from "@/lib/api/identity-document-types"
import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput"
import { PDF_ONLY_ACCEPT } from "@/lib/upload-constraints"

const DEFAULT_PHONE_COUNTRY_ISO2 = "SV"

export type PublicVacancyApplicationFormTheme = "dark" | "light"

const SOURCE_OPTION_KEYS = ["social", "friends", "jobFair", "other"] as const

function buildApplyConsentSnapshot(values: {
  firstName: string
  lastName: string
  email: string
  phone: string
  phoneCountryIso2: string
  nationalId: string
}): string {
  return JSON.stringify({
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    phoneCountryIso2: values.phoneCountryIso2.trim().toUpperCase() || DEFAULT_PHONE_COUNTRY_ISO2,
    nationalId: values.nationalId.trim(),
  })
}

interface PublicVacancyApplicationFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  phoneCountryIso2: string
  documentTypeId: string
  nationalId: string
  linkedinUrl: string
  websiteUrl: string
  source: string
  notes: string
}

type FieldKey = keyof PublicVacancyApplicationFormState | "cvFile"

const initialState: PublicVacancyApplicationFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  phoneCountryIso2: DEFAULT_PHONE_COUNTRY_ISO2,
  documentTypeId: "",
  nationalId: "",
  linkedinUrl: "",
  websiteUrl: "",
  source: "",
  notes: "",
}

function themeFieldClass(theme: PublicVacancyApplicationFormTheme): string {
  if (theme === "dark") {
    return "h-11 w-full rounded-2xl border border-border bg-muted/35 px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ats-cobre"
  }
  return "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ats-terracotta"
}

function themeLabelClass(theme: PublicVacancyApplicationFormTheme): string {
  if (theme === "dark") return "text-sm font-medium text-foreground"
  return "text-sm font-medium text-foreground"
}

function themeErrorClass(theme: PublicVacancyApplicationFormTheme): string {
  if (theme === "dark") return "text-xs text-ats-terracotta-soft"
  return "text-xs text-destructive"
}

function themeSelectClass(theme: PublicVacancyApplicationFormTheme): string {
  if (theme === "dark") {
    return "h-11 w-full rounded-2xl border border-border bg-muted/35 px-4 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ats-cobre [&>option]:bg-[#2A2B2E] [&>option]:text-foreground"
  }
  return "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ats-terracotta"
}

function themeTextareaClass(theme: PublicVacancyApplicationFormTheme): string {
  if (theme === "dark") {
    return "min-h-[120px] w-full rounded-[22px] border border-border bg-muted/35 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ats-cobre"
  }
  return "min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ats-terracotta"
}

function formatCvFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function themeCvDropzoneClass(
  theme: PublicVacancyApplicationFormTheme,
  opts: {
    isDragging: boolean
    hasFile: boolean
    hasError: boolean
    disabled: boolean
  }
): string {
  const radius = theme === "dark" ? "rounded-[22px]" : "rounded-lg"
  const focusRing =
    theme === "dark"
      ? "focus-visible:outline-ats-cobre"
      : "focus-visible:outline-ats-terracotta"
  const surface = opts.hasError
    ? "border-destructive bg-destructive/5"
    : opts.isDragging
      ? theme === "dark"
        ? "border-ats-cobre bg-ats-cobre/10"
        : "border-ats-terracotta bg-ats-terracotta/8"
      : opts.hasFile
        ? theme === "dark"
          ? "border-ats-cobre/45 bg-muted/35"
          : "border-ats-terracotta/40 bg-ats-terracotta/5"
        : theme === "dark"
          ? "border-border bg-muted/20 hover:border-foreground/30"
          : "border-border bg-background hover:border-muted-foreground/45"
  const interaction = opts.disabled
    ? "cursor-not-allowed opacity-60"
    : "cursor-pointer"

  return `relative block w-full ${radius} border-2 border-dashed p-10 text-center transition focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 ${focusRing} ${surface} ${interaction}`
}

function CvDropzoneGlyph() {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="mx-auto size-12 text-muted-foreground"
    >
      <path
        d="M16 8h11.172a2 2 0 0 1 1.414.586l7.828 7.828A2 2 0 0 1 37 17.828V38a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27 8v8a2 2 0 0 0 2 2h8M24 26v10m-5-5h10"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function getLoadingStepFromPercent(percent: number): 1 | 2 | 3 | 4 {
  if (percent < 24) return 1
  if (percent < 48) return 2
  if (percent < 72) return 3
  return 4
}

function applySubmitProgressPanelClass(
  theme: PublicVacancyApplicationFormTheme,
  opts: { absolute?: boolean } = {}
): string {
  const position = opts.absolute ? "absolute inset-0 z-20 " : ""
  if (theme === "dark") {
    return `${position}flex w-full min-h-[min(360px,70vh)] flex-col items-center justify-center rounded-[inherit] border border-ats-cobre/25 bg-[linear-gradient(180deg,rgba(32,33,36,0.97)_0%,rgba(32,33,36,0.99)_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl ring-1 ring-white/10`
  }
  return `${position}flex w-full min-h-[min(360px,70vh)] flex-col items-center justify-center rounded-lg border border-border bg-white/97 p-6 shadow-xl backdrop-blur-md ring-1 ring-ats-terracotta/15`
}

function PublicApplicationSubmitProgress({
  theme,
  mode,
  loadingBarPercent = 0,
  showLongWaitHint = false,
}: {
  theme: PublicVacancyApplicationFormTheme
  mode: "loading" | "success"
  /** 0–92 (tope del algoritmo compartido con `getLoadingBarPercent`) mientras `mode === "loading"`. */
  loadingBarPercent?: number
  showLongWaitHint?: boolean
}) {
  const t = useTranslations("PublicOpportunities.applicationForm")
  const isDark = theme === "dark"
  const isSuccess = mode === "success"
  const currentStep = isSuccess ? 5 : getLoadingStepFromPercent(loadingBarPercent)
  const stepLabels = [
    t("steps.creation"),
    t("steps.analysis"),
    t("steps.application"),
    t("steps.saved"),
    t("steps.success"),
  ]
  const activeLabel = stepLabels[currentStep - 1] ?? ""

  return (
    <div
      className="mx-auto w-full max-w-lg space-y-6"
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
      aria-busy={!isSuccess}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={
            isDark
              ? "flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/45 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted/60 shadow-sm"
          }
          aria-hidden
        >
          {isSuccess ? (
            <CheckCircle2
              className={
                isDark ? "h-8 w-8 text-ats-cobre" : "h-8 w-8 text-ats-cobre"
              }
            />
          ) : (
            <LoaderCircle
              className={
                isDark
                  ? "h-7 w-7 animate-spin text-ats-cobre"
                  : "h-7 w-7 animate-spin text-ats-terracotta"
              }
            />
          )}
        </div>
        <p
          className={
            isDark
              ? "mt-4 text-xs font-medium uppercase tracking-[0.2em] text-foreground/50"
              : "mt-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
          }
        >
          {isSuccess ? t("steps.ready") : t("steps.processingTitle")}
        </p>
        <p
          className={
            isDark
              ? "mt-2 text-lg font-semibold text-foreground"
              : "mt-2 text-lg font-semibold text-foreground"
          }
        >
          {activeLabel}
        </p>
        {!isSuccess && showLongWaitHint ? (
          <p
            className={
              isDark
                ? "mt-2 max-w-md text-sm leading-relaxed text-muted-foreground"
                : "mt-2 max-w-md text-sm leading-relaxed text-muted-foreground"
            }
          >
            {t("steps.processingLongWait")}
          </p>
        ) : null}
      </div>

      <ApplyStyleProgressBar
        theme="light"
        mode={isSuccess ? "success" : "loading"}
        percent={isSuccess ? 100 : loadingBarPercent}
      />

      <ol className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-5 sm:gap-2" aria-label={t("aria.submitStatus")}>
        {[1, 2, 3, 4, 5].map((step) => {
          const isComplete = currentStep > step
          const isCurrent = currentStep === step
          const isSuccessStep = step === 5
          const label = stepLabels[step - 1] ?? ""
          return (
            <li
              key={step}
              className={
                isDark
                  ? `rounded-xl border px-2 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs ${
                      isCurrent
                        ? isSuccessStep
                          ? "border-ats-cobre/60 bg-ats-cobre/12 text-ats-cobre"
                          : "border-ats-cobre/50 bg-muted/45 text-foreground"
                        : isComplete
                          ? "border-border bg-white/4 text-muted-foreground"
                          : "border-white/8 bg-muted/20 text-muted-foreground"
                    }`
                  : `rounded-xl border px-2 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs ${
                      isCurrent
                        ? isSuccessStep
                          ? "border-ats-cobre/50 bg-ats-cobre/10 text-ats-cobre"
                          : "border-ats-terracotta/50 bg-ats-terracotta/8 text-foreground"
                        : isComplete
                          ? "border-border bg-muted/50 text-muted-foreground"
                          : "border-border/60 bg-background text-muted-foreground/60"
                    }`
              }
            >
              {label}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function PublicVacancyApplicationForm({
  vacancyId,
  theme = "light",
  onRequestClose,
}: {
  vacancyId: string
  theme?: PublicVacancyApplicationFormTheme
  /** Tras éxito o al cerrar desde el modal. */
  onRequestClose?: () => void
}) {
  const t = useTranslations("PublicOpportunities.applicationForm")
  const [values, setValues] = useState<PublicVacancyApplicationFormState>(initialState)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0)
  const [submitPhase, setSubmitPhase] = useState<"idle" | "loading" | "success">("idle")
  const [loadingOverlay, setLoadingOverlay] = useState({ percent: 0, longWait: false })
  const [isConfirmEmailModalOpen, setIsConfirmEmailModalOpen] = useState(false)
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false)
  const [acceptedConsent, setAcceptedConsent] = useState<{
    payload: ConsentAuthorizationSubmitPayload
    snapshot: string
  } | null>(null)
  const loadingStartedAtRef = useRef(0)
  const cvInputRef = useRef<HTMLInputElement>(null)
  const [isCvDragging, setIsCvDragging] = useState(false)
  const [documentTypes, setDocumentTypes] = useState<IdentityDocumentTypeOptionDto[]>([])
  const [isLoadingDocumentTypes, setIsLoadingDocumentTypes] = useState(true)

  const inputClass = themeFieldClass(theme)
  const selectClass = themeSelectClass(theme)
  const textareaClass = themeTextareaClass(theme)
  const labelClass = themeLabelClass(theme)
  const errClass = themeErrorClass(theme)

  useEffect(() => {
    let isCancelled = false

    async function loadDocumentTypes() {
      setIsLoadingDocumentTypes(true)
      try {
        const types = await listIdentityDocumentTypes()
        if (!isCancelled) {
          setDocumentTypes(types)
        }
      } catch (error) {
        if (!isCancelled) {
          setDocumentTypes([])
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDocumentTypes(false)
        }
      }
    }

    void loadDocumentTypes()

    return () => {
      isCancelled = true
    }
  }, [])

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

  const handleChange = useCallback(
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = event.target
      const key = name as keyof PublicVacancyApplicationFormState
      setValues((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) => ({ ...prev, [key]: undefined, cvFile: undefined }))
      setServerError(null)
    },
    []
  )

  const handlePhoneChange = useCallback((phone: string) => {
    setValues((prev) => ({ ...prev, phone }))
    setErrors((prev) => ({ ...prev, phone: undefined }))
    setServerError(null)
  }, [])

  const handlePhoneCountryChange = useCallback((iso2: string) => {
    setValues((prev) => ({ ...prev, phoneCountryIso2: iso2 }))
    setServerError(null)
  }, [])

  const applyCvFile = useCallback(
    (file: File | null, input?: HTMLInputElement | null) => {
      if (file && !isAllowedCvFile(file)) {
        if (input) input.value = ""
        setCvFile(null)
        setErrors((prev) => ({ ...prev, cvFile: t("validation.fileType") }))
        setServerError(null)
        return
      }
      if (file && !isCvFileWithinSizeLimit(file)) {
        if (input) input.value = ""
        setCvFile(null)
        setErrors((prev) => ({ ...prev, cvFile: t("validation.fileTooLarge") }))
        setServerError(null)
        return
      }
      setCvFile(file)
      setErrors((prev) => ({ ...prev, cvFile: undefined }))
      setServerError(null)
    },
    [t]
  )

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      applyCvFile(event.target.files?.[0] ?? null, event.target)
    },
    [applyCvFile]
  )

  const handleCvDropzoneClick = useCallback(() => {
    if (submitPhase === "loading" || rateLimitSecondsLeft > 0) return
    cvInputRef.current?.click()
  }, [rateLimitSecondsLeft, submitPhase])

  const handleCvDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (submitPhase === "loading" || rateLimitSecondsLeft > 0) return
      event.preventDefault()
      event.stopPropagation()
      setIsCvDragging(true)
    },
    [rateLimitSecondsLeft, submitPhase]
  )

  const handleCvDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const related = event.relatedTarget
    if (related instanceof Node && event.currentTarget.contains(related)) return
    setIsCvDragging(false)
  }, [])

  const handleCvDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (submitPhase === "loading" || rateLimitSecondsLeft > 0) return
      event.preventDefault()
      event.stopPropagation()
      setIsCvDragging(false)
      applyCvFile(event.dataTransfer?.files?.[0] ?? null, cvInputRef.current)
    },
    [applyCvFile, rateLimitSecondsLeft, submitPhase]
  )

  const handleRemoveCvFile = useCallback(() => {
    if (submitPhase === "loading" || rateLimitSecondsLeft > 0) return
    if (cvInputRef.current) cvInputRef.current.value = ""
    applyCvFile(null)
  }, [applyCvFile, rateLimitSecondsLeft, submitPhase])

  const validateClient = useCallback((): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {}
    if (!values.firstName.trim()) next.firstName = t("validation.firstNameRequired")
    if (!values.lastName.trim()) next.lastName = t("validation.lastNameRequired")
    if (!values.email.trim()) next.email = t("validation.emailRequired")
    else if (!isValidEmailFormat(values.email)) next.email = t("validation.emailInvalid")
    if (!values.phone.trim()) next.phone = t("validation.phoneRequired")
    if (!values.documentTypeId.trim()) {
      next.documentTypeId = t("validation.documentTypeRequired")
    }
    if (!values.nationalId.trim()) {
      next.nationalId = t("validation.documentNumberRequired")
    }
    if (!cvFile) next.cvFile = t("validation.cvRequired")
    else if (!isAllowedCvFile(cvFile)) next.cvFile = t("validation.fileType")
    else if (!isCvFileWithinSizeLimit(cvFile)) next.cvFile = t("validation.fileTooLarge")

    return next
  }, [
    values.firstName,
    values.lastName,
    values.email,
    values.phone,
    values.documentTypeId,
    values.nationalId,
    cvFile,
    t,
  ])

  const executeSubmit = useCallback(async () => {
    if (!cvFile || !acceptedConsent) return

    setSubmitPhase("loading")
    setLoadingOverlay({ percent: 0, longWait: false })
    setServerError(null)
    setErrors({})
    setIsConfirmEmailModalOpen(false)

    const payload: PublicVacancyApplyValues = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      documentTypeId: values.documentTypeId,
      nationalId: values.nationalId,
      linkedinUrl: values.linkedinUrl,
      websiteUrl: values.websiteUrl,
      source: values.source,
      notes: values.notes,
      cvFile,
      authConsent: acceptedConsent.payload,
    }

    try {
      await submitPublicVacancyApplication(vacancyId, payload)
      setValues(initialState)
      setCvFile(null)
      setAcceptedConsent(null)
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

      const consentCode = getApiErrorCode(err)
      if (consentCode === "AUTH_CONSENT_VERSION_MISMATCH") {
        setServerError(t("validation.consentVersionMismatch"))
        return
      }
      if (consentCode === "AUTH_CONSENT_NATIONAL_ID_CONFLICT") {
        setServerError(t("validation.consentNationalIdConflict"))
        return
      }
      if (consentCode === "AUTH_CONSENT_VALIDATION") {
        setServerError(t("validation.consentValidation"))
        return
      }

      if (status === 429) {
        const seconds = parseRetryAfterSeconds(
          retryAfter != null && Number.isFinite(retryAfter)
            ? String(retryAfter)
            : null
        )
        setRateLimitSecondsLeft(seconds)
        const apiMessage = getPublicApplyErrorMessage(status, body)
        setServerError(
          apiMessage ||
            t("validation.rateLimited", { seconds: String(seconds) })
        )
        return
      }

      if (status === 413) {
        setErrors((prev) => ({
          ...prev,
          cvFile: t("validation.fileTooLarge"),
        }))
        setServerError(getPublicApplyErrorMessage(status, body))
        return
      }

      if (status === 415) {
        setErrors((prev) => ({
          ...prev,
          cvFile: t("validation.fileInvalid"),
        }))
        setServerError(getPublicApplyErrorMessage(status, body))
        return
      }

      if (status === 400) {
        const fieldMap = parsePublicApplyFieldErrors(body)
        if (Object.keys(fieldMap).length > 0) {
          setErrors(fieldMap as Partial<Record<FieldKey, string>>)
          setServerError(t("validation.reviewFields"))
          return
        }
        setServerError(getPublicApplyErrorMessage(status, body))
        return
      }

      setServerError(getPublicApplyErrorMessage(status, body))
    }
  }, [cvFile, values, vacancyId, t, acceptedConsent])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (submitPhase === "loading" || rateLimitSecondsLeft > 0) return

      const clientErrors = validateClient()
      if (Object.keys(clientErrors).length > 0) {
        setErrors(clientErrors)
        setServerError(null)
        return
      }

      const snapshot = buildApplyConsentSnapshot(values)
      if (acceptedConsent?.snapshot === snapshot) {
        setIsConfirmEmailModalOpen(true)
        return
      }

      setIsConsentModalOpen(true)
    },
    [submitPhase, rateLimitSecondsLeft, validateClient, values, acceptedConsent]
  )

  const consentInitialValues = useMemo<ConsentAuthorizationInitialValues>(
    () => ({
      firstNames: values.firstName,
      lastNames: values.lastName,
      documentId: values.nationalId,
      email: values.email,
      phone: values.phone,
      phoneCountryIso2: values.phoneCountryIso2,
    }),
    [
      values.firstName,
      values.lastName,
      values.nationalId,
      values.email,
      values.phone,
      values.phoneCountryIso2,
    ]
  )

  const handleCloseConsent = useCallback(() => {
    setIsConsentModalOpen(false)
  }, [])

  const handleAcceptConsent = useCallback(
    async (payload: ConsentAuthorizationSubmitPayload) => {
      setValues((prev) => ({
        ...prev,
        firstName: payload.firstNames,
        lastName: payload.lastNames,
        nationalId: payload.identityDocument || prev.nationalId,
        phone: payload.phoneNationalNumber || prev.phone,
        phoneCountryIso2:
          payload.phoneCountryIso2 || prev.phoneCountryIso2,
      }))
      setAcceptedConsent({
        payload,
        snapshot: buildApplyConsentSnapshot({
          firstName: payload.firstNames,
          lastName: payload.lastNames,
          email: values.email,
          phone: payload.phoneNationalNumber || values.phone,
          phoneCountryIso2:
            payload.phoneCountryIso2 || values.phoneCountryIso2,
          nationalId: payload.identityDocument || values.nationalId,
        }),
      })
      setIsConsentModalOpen(false)
      setIsConfirmEmailModalOpen(true)
    },
    [values.email, values.phone, values.phoneCountryIso2, values.nationalId]
  )

  if (submitPhase === "success") {
    return (
      <div className="space-y-6">
        <div
          className={applySubmitProgressPanelClass(theme)}
          role="status"
          aria-live="polite"
        >
          <PublicApplicationSubmitProgress mode="success" theme={theme} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/portal-oportunidades"
            className={
              theme === "dark"
                ? "inline-flex items-center justify-center rounded-full bg-ats-warm-white px-5 py-2.5 text-sm font-medium text-ats-grafito transition hover:opacity-95"
                : "inline-flex items-center justify-center rounded-lg bg-ats-terracotta px-5 py-2.5 text-sm font-medium text-ats-warm-white hover:opacity-95"
            }
          >
            {t("actions.backToList")}
          </Link>
          {onRequestClose ? (
            <button
              type="button"
              onClick={onRequestClose}
              className={
                theme === "dark"
                  ? "inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground/88 hover:bg-muted/45"
                  : "inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              }
            >
              {t("actions.close")}
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  const disabled = submitPhase === "loading" || rateLimitSecondsLeft > 0
  const showProgressOverlay = submitPhase === "loading"

  return (
    <div className="relative">
      {showProgressOverlay ? (
        <div className={applySubmitProgressPanelClass(theme, { absolute: true })}>
          <PublicApplicationSubmitProgress
            mode="loading"
            theme={theme}
            loadingBarPercent={loadingOverlay.percent}
            showLongWaitHint={loadingOverlay.longWait}
          />
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        aria-busy={showProgressOverlay}
        className={`grid grid-cols-2 gap-x-4 gap-y-5 transition-opacity duration-200 ${showProgressOverlay ? "pointer-events-none select-none opacity-[0.38] blur-[0.5px]" : ""}`}
      >
      {serverError ? (
        <p className={`col-span-2 ${errClass}`} role="alert">
          {serverError}
        </p>
      ) : null}

      <div className="space-y-2">
          <label htmlFor="apply-firstName" className={labelClass}>
            {t("fields.firstName")}
          </label>
          <input
            id="apply-firstName"
            name="firstName"
            value={values.firstName}
            onChange={handleChange}
            className={inputClass}
            disabled={disabled}
            autoComplete="given-name"
            placeholder={t("placeholders.firstName")}
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? "apply-firstName-err" : undefined}
          />
          {errors.firstName ? (
            <p id="apply-firstName-err" className={errClass} role="alert">
              {errors.firstName}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="apply-lastName" className={labelClass}>
            {t("fields.lastName")}
          </label>
          <input
            id="apply-lastName"
            name="lastName"
            value={values.lastName}
            onChange={handleChange}
            className={inputClass}
            disabled={disabled}
            autoComplete="family-name"
            placeholder={t("placeholders.lastName")}
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? "apply-lastName-err" : undefined}
          />
          {errors.lastName ? (
            <p id="apply-lastName-err" className={errClass} role="alert">
              {errors.lastName}
            </p>
          ) : null}
        </div>
      <div className="space-y-2">
          <label htmlFor="apply-email" className={labelClass}>
            {t("fields.email")}
          </label>
          <input
            id="apply-email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            className={inputClass}
            disabled={disabled}
            autoComplete="email"
            placeholder={t("placeholders.email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "apply-email-err" : undefined}
          />
          {errors.email ? (
            <p id="apply-email-err" className={errClass} role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="apply-phone" className={labelClass}>
            {t("fields.phone")}
          </label>
          <PhoneCountryInput
            id="apply-phone"
            name="phone"
            phone={values.phone}
            countryIso2={values.phoneCountryIso2}
            onPhoneChange={handlePhoneChange}
            onCountryChange={handlePhoneCountryChange}
            disabled={disabled}
            placeholder={t("placeholders.phone")}
            countryAriaLabel={t("aria.phoneCountry")}
            loadingLabel={t("placeholders.loadingCountries")}
            searchPlaceholder={t("placeholders.searchCountry")}
            emptyResultsLabel={t("placeholders.noCountries")}
            surface={theme === "dark" ? "public-dark" : "public-light"}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "apply-phone-err" : undefined}
          />
          {errors.phone ? (
            <p id="apply-phone-err" className={errClass} role="alert">
              {errors.phone}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="apply-documentTypeId" className={labelClass}>
            {t("fields.documentType")}
          </label>
          <select
            id="apply-documentTypeId"
            name="documentTypeId"
            value={values.documentTypeId}
            onChange={handleChange}
            className={selectClass}
            disabled={disabled || isLoadingDocumentTypes}
            aria-invalid={Boolean(errors.documentTypeId)}
            aria-describedby={errors.documentTypeId ? "apply-documentTypeId-err" : undefined}
          >
            <option value="">
              {isLoadingDocumentTypes
                ? t("placeholders.loadingDocTypes")
                : documentTypes.length === 0
                  ? t("placeholders.noDocTypes")
                  : t("placeholders.selectDocType")}
            </option>
            {documentTypes.map((docType) => (
              <option key={docType.id} value={docType.id}>
                {docType.name}
              </option>
            ))}
          </select>
          {errors.documentTypeId ? (
            <p id="apply-documentTypeId-err" className={errClass} role="alert">
              {errors.documentTypeId}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="apply-nationalId" className={labelClass}>
            {t("fields.documentNumber")}
          </label>
          <input
            id="apply-nationalId"
            name="nationalId"
            value={values.nationalId}
            onChange={handleChange}
            className={inputClass}
            disabled={disabled}
            placeholder={t("placeholders.documentNumber")}
            aria-invalid={Boolean(errors.nationalId)}
            aria-describedby={errors.nationalId ? "apply-nationalId-err" : undefined}
          />
          {errors.nationalId ? (
            <p id="apply-nationalId-err" className={errClass} role="alert">
              {errors.nationalId}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="apply-source" className={labelClass}>
            {t("fields.source")}
          </label>
          <select
            id="apply-source"
            name="source"
            value={values.source}
            onChange={handleChange}
            className={selectClass}
            disabled={disabled}
            aria-invalid={Boolean(errors.source)}
            aria-describedby={errors.source ? "apply-source-err" : undefined}
          >
            <option value="">{t("placeholders.selectOption")}</option>
            {SOURCE_OPTION_KEYS.map((key) => (
              <option key={key} value={t(`sources.${key}`)}>
                {t(`sources.${key}`)}
              </option>
            ))}
          </select>
          {errors.source ? (
            <p id="apply-source-err" className={errClass} role="alert">
              {errors.source}
            </p>
          ) : null}
        </div>
      <div className="space-y-2">
          <label htmlFor="apply-linkedin" className={labelClass}>
            {t("fields.linkedin")}
          </label>
          <input
            id="apply-linkedin"
            name="linkedinUrl"
            value={values.linkedinUrl}
            onChange={handleChange}
            className={inputClass}
            disabled={disabled}
            placeholder="https://linkedin.com/in/…"
          />
        </div>
      <div className="space-y-2">
          <label htmlFor="apply-website" className={labelClass}>
            {t("fields.website")}
          </label>
          <input
            id="apply-website"
            name="websiteUrl"
            value={values.websiteUrl}
            onChange={handleChange}
            className={inputClass}
            disabled={disabled}
            placeholder="https://…"
          />
        </div>
      <div className="space-y-2">
        <label htmlFor="apply-notes" className={labelClass}>
          {t("fields.notes")}
        </label>
        <textarea
          id="apply-notes"
          name="notes"
          value={values.notes}
          onChange={handleChange}
          rows={4}
          disabled={disabled}
          className={textareaClass}
        />
        {errors.notes ? (
          <p className={errClass} role="alert">
            {errors.notes}
          </p>
        ) : null}
      </div>

      <div className="col-span-2 space-y-2">
        <label htmlFor="apply-cv" className={labelClass}>
          {t("fields.resume")}
        </label>
        <div
          className="relative"
          onDragOver={handleCvDragOver}
          onDragLeave={handleCvDragLeave}
          onDrop={handleCvDrop}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={handleCvDropzoneClick}
            aria-label={
              isCvDragging
                ? t("file.dropActive")
                : cvFile
                  ? cvFile.name
                  : t("file.selectPdf")
            }
            aria-describedby={
              errors.cvFile ? "apply-cv-helper apply-cv-err" : "apply-cv-helper"
            }
            aria-invalid={Boolean(errors.cvFile)}
            className={themeCvDropzoneClass(theme, {
              isDragging: isCvDragging,
              hasFile: Boolean(cvFile),
              hasError: Boolean(errors.cvFile),
              disabled,
            })}
          >
            {cvFile ? (
              <FileText
                className={
                  theme === "dark"
                    ? "mx-auto size-12 text-ats-cobre"
                    : "mx-auto size-12 text-ats-terracotta"
                }
                strokeWidth={1.5}
                aria-hidden
              />
            ) : (
              <CvDropzoneGlyph />
            )}
            <span className="mt-2 block text-sm font-semibold text-foreground">
              {isCvDragging
                ? t("file.dropActive")
                : cvFile
                  ? cvFile.name
                  : t("file.selectPdf")}
            </span>
            <span
              id="apply-cv-helper"
              className="mt-1 block text-xs text-muted-foreground"
            >
              {cvFile
                ? `${formatCvFileSize(cvFile.size)} · ${t("file.changeFile")}`
                : t("file.helper")}
            </span>
          </button>
          {cvFile ? (
            <button
              type="button"
              onClick={handleRemoveCvFile}
              disabled={disabled}
              className={
                theme === "dark"
                  ? "absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  : "absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              }
              aria-label={t("file.removeAria", { fileName: cvFile.name })}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
          <input
            ref={cvInputRef}
            id="apply-cv"
            name="cvFile"
            type="file"
            accept={PDF_ONLY_ACCEPT}
            onChange={handleFileChange}
            className="sr-only"
            tabIndex={-1}
            disabled={disabled}
          />
        </div>
        {errors.cvFile ? (
          <p id="apply-cv-err" className={errClass} role="alert">
            {errors.cvFile}
          </p>
        ) : null}
      </div>

      <div
        className={`col-span-2 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center ${
          theme === "dark" ? "border-border" : "border-border"
        }`}
      >
        <button
          type="submit"
          disabled={disabled}
          className={
            theme === "dark"
              ? "inline-flex w-full items-center justify-center gap-2 rounded-full bg-ats-warm-white px-6 py-3 text-sm font-medium text-ats-grafito disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              : "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ats-terracotta px-6 py-3 text-sm font-medium text-ats-warm-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          }
          aria-live="polite"
        >
          {disabled && submitPhase === "loading" ? (
            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {submitPhase === "loading"
            ? t("actions.submitting")
            : rateLimitSecondsLeft > 0
              ? t("actions.retryIn", { seconds: String(rateLimitSecondsLeft) })
              : t("actions.submit")}
        </button>
        {submitPhase === "loading" ? (
          <p
            className={
              theme === "dark"
                ? "text-xs text-muted-foreground sm:ml-1"
                : "text-xs text-muted-foreground sm:ml-1"
            }
            role="status"
            aria-live="polite"
          >
            {t("steps.processingHint")}
          </p>
        ) : null}
      </div>
    </form>
    
    <ApplyEmailConfirmationModal
      isOpen={isConfirmEmailModalOpen}
      onConfirm={executeSubmit}
      onCancel={() => setIsConfirmEmailModalOpen(false)}
      email={values.email}
      theme={theme}
      isSubmitting={submitPhase === "loading"}
    />
    <ConsentAuthorizationModal
      isOpen={isConsentModalOpen}
      onClose={handleCloseConsent}
      onAccept={handleAcceptConsent}
      initialValues={consentInitialValues}
      variant="public"
      isDismissible
    />
    </div>
  )
}
