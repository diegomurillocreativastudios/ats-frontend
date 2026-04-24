"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { LoaderCircle, Mail, Paperclip } from "lucide-react"
import {
  getPublicApplyErrorMessage,
  isAllowedCvFile,
  isValidEmailFormat,
  parsePublicApplyFieldErrors,
  submitPublicVacancyApplication,
  type PublicVacancyApplyValues,
} from "@/lib/public-vacancy-apply"

export type PublicVacancyApplicationFormTheme = "dark" | "light"

const SOURCE_OPTIONS = [
  { value: "Redes sociales", label: "Redes sociales" },
  { value: "Amigos", label: "Amigos" },
  { value: "Feria de empleo", label: "Feria de empleo" },
  { value: "Otros", label: "Otros" },
] as const

interface PublicVacancyApplicationFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
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

const APPLY_PROGRESS_STEPS = [
  { step: 1, label: "Creación" },
  { step: 2, label: "Análisis" },
  { step: 3, label: "Postulación" },
  { step: 4, label: "Guardado" },
  { step: 5, label: "Éxito" },
] as const

/** Objetivo ~15–25 s en datos reales: recorrer pasos 1→4 de forma uniforme (~20 s). */
const APPLY_PROGRESS_STEPS_1_TO_4_TOTAL_MS = 20_000
/** Tres saltos (1→2, 2→3, 3→4) repartidos en ese tiempo. */
const APPLY_PROGRESS_MS = Math.round(APPLY_PROGRESS_STEPS_1_TO_4_TOTAL_MS / 3)

function applySubmitProgressPanelClass(
  theme: PublicVacancyApplicationFormTheme,
  opts: { absolute?: boolean } = {}
): string {
  const position = opts.absolute ? "absolute inset-0 z-20 " : ""
  if (theme === "dark") {
    return `${position}flex w-full min-h-[min(360px,70vh)] flex-col items-center justify-center rounded-[inherit] border border-white/10 bg-[linear-gradient(180deg,rgba(25,33,58,0.98)_0%,rgba(16,22,40,0.99)_100%)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md`
  }
  return `${position}flex w-full min-h-[min(360px,70vh)] flex-col items-center justify-center rounded-lg border border-border bg-background/95 p-6 shadow-lg backdrop-blur-sm`
}

function PublicApplicationSubmitProgress({
  currentStep,
  theme,
  barTransitionMs = APPLY_PROGRESS_MS,
}: {
  currentStep: number
  theme: PublicVacancyApplicationFormTheme
  /** Duración de la animación de la barra al cambiar de paso (ms). */
  barTransitionMs?: number
}) {
  const isDark = theme === "dark"
  const doneCount = Math.min(Math.max(currentStep, 0), 5)
  const pct = (doneCount / 5) * 100
  const activeLabel =
    APPLY_PROGRESS_STEPS.find((s) => s.step === currentStep)?.label ?? ""

  return (
    <div
      className="mx-auto w-full max-w-lg space-y-6"
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
    >
      <div className="text-center">
        <p
          className={
            isDark
              ? "text-xs font-medium uppercase tracking-[0.2em] text-white/50"
              : "text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
          }
        >
          {currentStep === 5 ? "Listo" : "Procesando tu postulación"}
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
      </div>

      <div
        className={isDark ? "overflow-hidden rounded-full bg-white/10" : "overflow-hidden rounded-full bg-muted"}
        aria-hidden
      >
        <div
          className={
            isDark
              ? "h-2.5 rounded-full bg-[linear-gradient(90deg,#f0a7ff_0%,#8dd8ff_100%)]"
              : "h-2.5 rounded-full bg-vo-purple"
          }
          style={{
            width: `${pct}%`,
            transition: `width ${barTransitionMs}ms cubic-bezier(0.33, 0.86, 0.2, 1)`,
          }}
        />
      </div>

      <ol className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-5 sm:gap-2" aria-label="Estado del envío">
        {APPLY_PROGRESS_STEPS.map((item) => {
          const isComplete = currentStep > item.step
          const isCurrent = currentStep === item.step
          const isSuccessStep = item.step === 5
          return (
            <li
              key={item.step}
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
              {item.label}
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
  const [values, setValues] = useState<PublicVacancyApplicationFormState>(initialState)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitPhase, setSubmitPhase] = useState<"idle" | "loading" | "success">("idle")
  const [progressStep, setProgressStep] = useState(0)

  const inputClass = themeFieldClass(theme)
  const selectClass = themeSelectClass(theme)
  const textareaClass = themeTextareaClass(theme)
  const labelClass = themeLabelClass(theme)
  const errClass = themeErrorClass(theme)

  useEffect(() => {
    if (submitPhase !== "loading") return
    if (progressStep >= 4) return
    const id = window.setTimeout(() => {
      setProgressStep((s) => (s < 4 ? s + 1 : 4))
    }, APPLY_PROGRESS_MS)
    return () => window.clearTimeout(id)
  }, [submitPhase, progressStep])

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
      setErrors((prev) => ({ ...prev, cvFile: "Solo se aceptan archivos PDF o DOCX." }))
      setServerError(null)
      return
    }
    setCvFile(file)
    setErrors((prev) => ({ ...prev, cvFile: undefined }))
    setServerError(null)
  }, [])

  const validateClient = useCallback((): Partial<Record<FieldKey, string>> => {
    const next: Partial<Record<FieldKey, string>> = {}
    if (!values.firstName.trim()) next.firstName = "Ingresa tu nombre."
    if (!values.lastName.trim()) next.lastName = "Ingresa tu apellido."
    if (!values.email.trim()) next.email = "Ingresa tu correo."
    else if (!isValidEmailFormat(values.email)) next.email = "Ingresa un correo válido."
    if (!cvFile) next.cvFile = "Adjunta tu CV en PDF o DOCX."
    else if (!isAllowedCvFile(cvFile))
      next.cvFile = "Solo se aceptan archivos PDF o DOCX."
    return next
  }, [values.firstName, values.lastName, values.email, cvFile])

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

      if (!cvFile) return

      setSubmitPhase("loading")
      setProgressStep(1)
      setServerError(null)
      setErrors({})

      const payload: PublicVacancyApplyValues = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        linkedinUrl: values.linkedinUrl,
        websiteUrl: values.websiteUrl,
        source: values.source,
        notes: values.notes,
        cvFile,
      }

      try {
        await submitPublicVacancyApplication(vacancyId, payload)
        setProgressStep(5)
        setValues(initialState)
        setCvFile(null)
        setSubmitPhase("success")
      } catch (err: unknown) {
        setProgressStep(0)
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
            setServerError("Revisa los datos indicados.")
            return
          }
        }

        setServerError(getPublicApplyErrorMessage(status, body))
      }
    },
    [cvFile, submitPhase, validateClient, values, vacancyId]
  )

  if (submitPhase === "success") {
    return (
      <div className="space-y-6">
        <div
          className={applySubmitProgressPanelClass(theme)}
          role="status"
          aria-live="polite"
        >
          <PublicApplicationSubmitProgress
            currentStep={5}
            theme={theme}
            barTransitionMs={Math.min(1200, APPLY_PROGRESS_MS)}
          />
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
              Volver a la vacante
            </Link>
          ) : null}
          <Link
            href="/oportunidades"
            className={
              theme === "dark"
                ? "inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#18213d] transition hover:opacity-95"
                : "inline-flex items-center justify-center rounded-lg bg-vo-purple px-5 py-2.5 text-sm font-medium text-white hover:opacity-95"
            }
          >
            Volver a vacantes
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
              Cerrar
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
            currentStep={progressStep}
            theme={theme}
            barTransitionMs={APPLY_PROGRESS_MS}
          />
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        aria-busy={showProgressOverlay}
        className={`grid grid-cols-2 gap-x-4 gap-y-5 ${showProgressOverlay ? "pointer-events-none select-none opacity-[0.22]" : ""}`}
      >
      {serverError ? (
        <p className={`col-span-2 ${errClass}`} role="alert">
          {serverError}
        </p>
      ) : null}

      <div className="space-y-2">
          <label htmlFor="apply-firstName" className={labelClass}>
            Nombre *
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
            Apellido *
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
            Correo electrónico *
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
            Teléfono
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
          <label htmlFor="apply-source" className={labelClass}>
            ¿Cómo supiste de esta vacante?
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
            <option value="">Seleccioná una opción</option>
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
            Perfil de LinkedIn
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
            Sitio web o portafolio
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
          Notas
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
          Currículum (PDF) *
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
            Seleccionar PDF
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
            Solo se acepta formato PDF o DOCX.
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
          {disabled ? "Enviando postulación…" : "Enviar postulación"}
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
            Estamos validando tu información y subiendo tu CV. Esto puede tardar unos segundos.
          </p>
        ) : null}
      </div>
    </form>
    </div>
  )
}
