"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2, LoaderCircle, Mail, Paperclip } from "lucide-react"
import {
  getPublicApplyErrorMessage,
  isAllowedCvFile,
  isValidEmailFormat,
  parsePublicApplyFieldErrors,
  submitPublicVacancyApplication,
  type PublicVacancyApplyValues,
} from "@/lib/public-vacancy-apply"
import {
  APPLY_LOADING_TICK_MS,
  APPLY_LONG_WAIT_HINT_MS,
  getLoadingBarPercent,
} from "@/lib/apply-loading-bar"
import { ApplyStyleProgressBar } from "@/components/public/apply-style-progress-bar"
import { ApplyEmailConfirmationModal } from "@/components/public/ApplyEmailConfirmationModal"
import {
  listIdentityDocumentTypes,
  type IdentityDocumentTypeOptionDto,
} from "@/lib/api/identity-document-types"

export type PublicVacancyApplicationFormTheme = "dark" | "light"

const SOURCE_OPTION_KEYS = ["social", "friends", "jobFair", "other"] as const

interface PublicVacancyApplicationFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
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
  documentTypeId: "",
  nationalId: "",
  linkedinUrl: "",
  websiteUrl: "",
  source: "",
  notes: "",
}

function themeFieldClass(theme: PublicVacancyApplicationFormTheme): string {
  if (theme === "dark") {
    return "h-11 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none transition placeholder:text-white/38 focus:ring-2 focus:ring-[#f0a7ff]"
  }
  return "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-vo-purple"
}

function themeLabelClass(theme: PublicVacancyApplicationFormTheme): string {
  if (theme === "dark") return "text-sm font-medium text-white/82"
  return "text-sm font-medium text-foreground"
}

function themeErrorClass(theme: PublicVacancyApplicationFormTheme): string {
  if (theme === "dark") return "text-xs text-[#ffd0e7]"
  return "text-xs text-destructive"
}

function themeSelectClass(theme: PublicVacancyApplicationFormTheme): string {
  if (theme === "dark") {
    return "h-11 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none transition focus:ring-2 focus:ring-[#f0a7ff] [&>option]:bg-[#1a2238] [&>option]:text-white"
  }
  return "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-vo-purple"
}

function themeTextareaClass(theme: PublicVacancyApplicationFormTheme): string {
  if (theme === "dark") {
    return "min-h-[120px] w-full rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/38 focus:ring-2 focus:ring-[#f0a7ff]"
  }
  return "min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-vo-purple"
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
    return `${position}flex w-full min-h-[min(360px,70vh)] flex-col items-center justify-center rounded-[inherit] border border-[#f0a7ff]/25 bg-[linear-gradient(180deg,rgba(18,24,44,0.97)_0%,rgba(12,17,32,0.99)_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl ring-1 ring-white/10`
  }
  return `${position}flex w-full min-h-[min(360px,70vh)] flex-col items-center justify-center rounded-lg border border-border bg-background/97 p-6 shadow-xl backdrop-blur-md ring-1 ring-vo-purple/15`
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
              ? "flex h-14 w-14 items-center justify-center rounded-2xl border border-white/14 bg-white/8 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              : "flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted/60 shadow-sm"
          }
          aria-hidden
        >
          {isSuccess ? (
            <CheckCircle2
              className={
                isDark ? "h-8 w-8 text-[#7ee0c0]" : "h-8 w-8 text-emerald-600"
              }
            />
          ) : (
            <LoaderCircle
              className={
                isDark
                  ? "h-7 w-7 animate-spin text-[#f0a7ff]"
                  : "h-7 w-7 animate-spin text-vo-purple"
              }
            />
          )}
        </div>
        <p
          className={
            isDark
              ? "mt-4 text-xs font-medium uppercase tracking-[0.2em] text-white/50"
              : "mt-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
          }
        >
          {isSuccess ? t("steps.ready") : t("steps.processingTitle")}
        </p>
        <p
          className={
            isDark
              ? "mt-2 text-lg font-semibold text-white"
              : "mt-2 text-lg font-semibold text-foreground"
          }
        >
          {activeLabel}
        </p>
        {!isSuccess && showLongWaitHint ? (
          <p
            className={
              isDark
                ? "mt-2 max-w-md text-sm leading-relaxed text-white/64"
                : "mt-2 max-w-md text-sm leading-relaxed text-muted-foreground"
            }
          >
            {t("steps.processingLongWait")}
          </p>
        ) : null}
      </div>

      <ApplyStyleProgressBar
        theme={isDark ? "dark" : "light"}
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
                          ? "border-[#7ee0c0]/60 bg-[#7ee0c0]/12 text-[#7ee0c0]"
                          : "border-[#f0a7ff]/50 bg-white/8 text-white"
                        : isComplete
                          ? "border-white/12 bg-white/4 text-white/60"
                          : "border-white/8 bg-white/3 text-white/40"
                    }`
                  : `rounded-xl border px-2 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs ${
                      isCurrent
                        ? isSuccessStep
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800"
                          : "border-vo-purple/50 bg-vo-purple/8 text-foreground"
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
  theme = "dark",
  backToVacancyHref,
  onRequestClose,
}: {
  vacancyId: string
  theme?: PublicVacancyApplicationFormTheme
  /** En página completa: enlace “Volver a vacantes”. */
  backToVacancyHref?: string
  /** Tras éxito o al cerrar desde el modal. */
  onRequestClose?: () => void
}) {
  const t = useTranslations("PublicOpportunities.applicationForm")
  const [values, setValues] = useState<PublicVacancyApplicationFormState>(initialState)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitPhase, setSubmitPhase] = useState<"idle" | "loading" | "success">("idle")
  const [loadingOverlay, setLoadingOverlay] = useState({ percent: 0, longWait: false })
  const [isConfirmEmailModalOpen, setIsConfirmEmailModalOpen] = useState(false)
  const loadingStartedAtRef = useRef(0)
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

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (file && !isAllowedCvFile(file)) {
      event.target.value = ""
      setCvFile(null)
      setErrors((prev) => ({ ...prev, cvFile: t("validation.fileType") }))
      setServerError(null)
      return
    }
    setCvFile(file)
    setErrors((prev) => ({ ...prev, cvFile: undefined }))
    setServerError(null)
  }, [t])

  const validateClient = useCallback((): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {}
    if (!values.firstName.trim()) next.firstName = t("validation.firstNameRequired")
    if (!values.lastName.trim()) next.lastName = t("validation.lastNameRequired")
    if (!values.email.trim()) next.email = t("validation.emailRequired")
    else if (!isValidEmailFormat(values.email)) next.email = t("validation.emailInvalid")
    if (!cvFile) next.cvFile = t("validation.cvRequired")
    else if (!isAllowedCvFile(cvFile))
      next.cvFile = t("validation.fileType")
    
    const hasDocumentType = values.documentTypeId.trim() !== ""
    const hasNationalId = values.nationalId.trim() !== ""
    
    if (hasDocumentType && !hasNationalId) {
      next.nationalId = t("validation.documentTypeRequiresNumber")
    }
    if (hasNationalId && !hasDocumentType) {
      next.documentTypeId = t("validation.documentNumberRequiresType")
    }
    
    return next
  }, [values.firstName, values.lastName, values.email, values.documentTypeId, values.nationalId, cvFile, t])

  const executeSubmit = useCallback(async () => {
    if (!cvFile) return

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
    }

    try {
      await submitPublicVacancyApplication(vacancyId, payload)
      setValues(initialState)
      setCvFile(null)
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

      if (status === 400) {
        const fieldMap = parsePublicApplyFieldErrors(body)
        if (Object.keys(fieldMap).length > 0) {
          setErrors(fieldMap as Partial<Record<FieldKey, string>>)
          setServerError(t("validation.reviewFields"))
          return
        }
      }

      setServerError(getPublicApplyErrorMessage(status, body))
    }
  }, [cvFile, values, vacancyId, t])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (submitPhase === "loading") return

      const clientErrors = validateClient()
      if (Object.keys(clientErrors).length > 0) {
        setErrors(clientErrors)
        setServerError(null)
        return
      }

      setIsConfirmEmailModalOpen(true)
    },
    [submitPhase, validateClient]
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
          {backToVacancyHref ? (
            <Link
              href={backToVacancyHref}
              className={
                theme === "dark"
                  ? "inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/16"
                  : "inline-flex items-center justify-center rounded-lg border border-border bg-muted px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80"
              }
            >
              {t("actions.backToVacancy")}
            </Link>
          ) : null}
          <Link
            href="/portal-oportunidades"
            className={
              theme === "dark"
                ? "inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#18213d] transition hover:opacity-95"
                : "inline-flex items-center justify-center rounded-lg bg-vo-purple px-5 py-2.5 text-sm font-medium text-white hover:opacity-95"
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
                  ? "inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/88 hover:bg-white/8"
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

  const disabled = submitPhase === "loading"
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
          <input
            id="apply-phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={handleChange}
            className={inputClass}
            disabled={disabled}
            autoComplete="tel"
          />
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
          className={
            theme === "dark"
              ? "rounded-[22px] border border-dashed border-white/10 bg-white/6 p-4"
              : "rounded-lg border border-dashed border-border bg-muted/40 p-4"
          }
        >
          <label
            htmlFor="apply-cv"
            className={
              theme === "dark"
                ? "inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#18213d]"
                : "inline-flex cursor-pointer items-center gap-2 rounded-lg bg-vo-purple px-4 py-2 text-sm font-medium text-white"
            }
          >
            <Paperclip className="h-4 w-4 shrink-0" aria-hidden />
            {t("file.selectPdf")}
          </label>
          <input
            id="apply-cv"
            name="cvFile"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="sr-only"
            disabled={disabled}
          />
          <p
            className={
              theme === "dark"
                ? "mt-3 text-xs text-white/56"
                : "mt-3 text-xs text-muted-foreground"
            }
          >
            {t("file.helper")}
          </p>
          {cvFile ? (
            <p
              className={
                theme === "dark" ? "mt-2 text-sm text-white/78" : "mt-2 text-sm text-foreground"
              }
            >
              {cvFile.name}
            </p>
          ) : null}
        </div>
        {errors.cvFile ? (
          <p className={errClass} role="alert">
            {errors.cvFile}
          </p>
        ) : null}
      </div>

      <div
        className={`col-span-2 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center ${
          theme === "dark" ? "border-white/10" : "border-border"
        }`}
      >
        <button
          type="submit"
          disabled={disabled}
          className={
            theme === "dark"
              ? "inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#18213d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              : "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-vo-purple px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          }
          aria-live="polite"
        >
          {disabled ? (
            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {disabled ? t("actions.submitting") : t("actions.submit")}
        </button>
        {disabled ? (
          <p
            className={
              theme === "dark"
                ? "text-xs text-white/72 sm:ml-1"
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
    </div>
  )
}
