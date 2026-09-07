"use client"

import {
  useState,
  useCallback,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import Input from "@/components/auth/Input"
import OtpCodeInput from "@/components/auth/OtpCodeInput"
import Button from "@/components/auth/Button"
import AuthBrand from "@/components/auth/AuthBrand"
import ProductBrand from "@/components/branding/ProductBrand"
import LanguageSwitcher from "@/components/language-switcher"
import Snackbar from "@/components/ui/Snackbar"
import { csrfHeaders } from "@/lib/auth/csrf-client"
import { resolveAuthRedirectDestination } from "@/lib/auth/internal-path"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"
import {
  isValidRegisterEmail,
  isValidRegisterOtpCode,
} from "@/lib/auth/register-otp"

type RegisterStep = "email" | "code" | "password"

interface RegisterFormState {
  email: string
  code: string
  password: string
  confirmPassword: string
}

interface SnackbarState {
  type: "success" | "error"
  text: string
}

const EMAIL_STEP = 1
const CODE_STEP = 2
const PASSWORD_STEP = 3
const TOTAL_STEPS = 3
const RESEND_COOLDOWN_SECONDS = 60

const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : ""

const STEP_NUMBER: Record<RegisterStep, number> = {
  email: EMAIL_STEP,
  code: CODE_STEP,
  password: PASSWORD_STEP,
}

export default function Registrarse() {
  const t = useTranslations("Auth.register")
  const tValidation = useTranslations("Validation")
  const router = useRouter()
  const [step, setStep] = useState<RegisterStep>("email")
  const [formData, setFormData] = useState<RegisterFormState>({
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState<SnackbarState | null>(null)
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0)
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0)
  const [errors, setErrors] = useState<
    Partial<Record<keyof RegisterFormState, string>>
  >({})

  const handleCloseSnackbar = useCallback(() => {
    setMessage(null)
  }, [])

  useEffect(() => {
    if (rateLimitSecondsLeft <= 0) return
    const id = window.setInterval(() => {
      setRateLimitSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [rateLimitSecondsLeft])

  useEffect(() => {
    if (resendSecondsLeft <= 0) return
    const id = window.setInterval(() => {
      setResendSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [resendSecondsLeft])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked } = e.target
    let { value } = e.target
    const field = name as keyof RegisterFormState
    if (field === "code") {
      value = value.replace(/\D/g, "").slice(0, 6)
    }
    setFormData((prev) => ({
      ...prev,
      [field]: type === "checkbox" ? checked : value,
    }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
    setMessage(null)
  }

  const handleCodeChange = (code: string) => {
    setFormData((prev) => ({ ...prev, code }))
    if (errors.code) {
      setErrors((prev) => ({ ...prev, code: "" }))
    }
    setMessage(null)
  }

  const isEmailSubmitBlocked =
    loading || (step === "email" && rateLimitSecondsLeft > 0)
  const isCodeSubmitBlocked =
    loading || (step === "code" && rateLimitSecondsLeft > 0)
  const isPasswordSubmitBlocked =
    loading || (step === "password" && rateLimitSecondsLeft > 0)
  const isResendBlocked =
    loading || resending || resendSecondsLeft > 0 || rateLimitSecondsLeft > 0

  const applyRetryAfter = (res: Response) => {
    setRateLimitSecondsLeft(
      parseRetryAfterSeconds(res.headers.get("retry-after")),
    )
  }

  const requestCode = async () => {
    const res = await fetch(`${getOrigin()}/api/auth/register/otp/request`, {
      method: "POST",
      headers: await csrfHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify({ email: formData.email.trim() }),
    })

    if (!res.ok) {
      if (res.status === 429) applyRetryAfter(res)
      const text =
        res.status === 429
          ? t("errors.rateLimited")
          : res.status >= 500
            ? t("errors.server")
            : t("errors.generic")
      setMessage({ type: "error", text })
      return false
    }

    setResendSecondsLeft(RESEND_COOLDOWN_SECONDS)
    setMessage({ type: "success", text: t("toastCodeSent") })
    return true
  }

  const handleEmailSubmit = async () => {
    const email = formData.email.trim()
    if (!email) {
      setErrors({ email: tValidation("emailRequired") })
      return
    }
    if (!isValidRegisterEmail(email)) {
      setErrors({ email: tValidation("invalidEmail") })
      return
    }

    setLoading(true)
    try {
      const sent = await requestCode()
      if (sent) setStep("code")
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async () => {
    if (!isValidRegisterOtpCode(formData.code)) {
      setErrors({ code: tValidation("invalidCode") })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${getOrigin()}/api/auth/register/otp/check`, {
        method: "POST",
        headers: await csrfHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          email: formData.email.trim(),
          code: formData.code,
        }),
      })

      if (!res.ok) {
        if (res.status === 429) applyRetryAfter(res)
        if (res.status === 401) {
          setErrors({ code: t("errors.invalidCode") })
        }
        const text =
          res.status === 401
            ? t("errors.invalidCode")
            : res.status === 429
              ? t("errors.rateLimited")
              : res.status >= 500
                ? t("errors.server")
                : t("errors.generic")
        setMessage({ type: "error", text })
        return
      }

      setStep("password")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async () => {
    const nextErrors: Partial<Record<keyof RegisterFormState, string>> = {}
    if (!formData.password) {
      nextErrors.password = tValidation("passwordRequired")
    } else if (formData.password.length < 8) {
      nextErrors.password = tValidation("passwordMinLength")
    }
    if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = tValidation("passwordsDontMatch")
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${getOrigin()}/api/auth/register/otp/verify`, {
        method: "POST",
        headers: await csrfHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          email: formData.email.trim(),
          code: formData.code,
          password: formData.password,
        }),
      })

      if (!res.ok) {
        if (res.status === 429) applyRetryAfter(res)
        if (res.status === 401) {
          setStep("code")
          setErrors({ code: t("errors.invalidCode") })
        }
        const text =
          res.status === 401
            ? t("errors.invalidCode")
            : res.status === 429
              ? t("errors.rateLimited")
              : res.status >= 500
                ? t("errors.server")
                : t("errors.generic")
        setMessage({ type: "error", text })
        return
      }

      setMessage({ type: "success", text: t("toastSignedIn") })
      const from =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("from")
          : null
      router.push(resolveAuthRedirectDestination([from]))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    setErrors({})

    if (step === "email") {
      await handleEmailSubmit()
      return
    }
    if (step === "code") {
      await handleCodeSubmit()
      return
    }
    await handlePasswordSubmit()
  }

  const handleResend = async () => {
    if (isResendBlocked) return
    setMessage(null)
    setResending(true)
    try {
      await requestCode()
    } finally {
      setResending(false)
    }
  }

  const handleChangeEmail = () => {
    setStep("email")
    setErrors({})
    setMessage(null)
  }

  const handleBackToCode = () => {
    setStep("code")
    setErrors({})
    setMessage(null)
  }

  const submitLabel = () => {
    if (step === "email") {
      if (loading) return t("sendingCode")
      if (rateLimitSecondsLeft > 0) {
        return t("retryIn", { seconds: rateLimitSecondsLeft })
      }
      return t("sendCode")
    }
    if (step === "code") {
      if (loading) return t("checkingCode")
      if (rateLimitSecondsLeft > 0) {
        return t("retryIn", { seconds: rateLimitSecondsLeft })
      }
      return t("codeContinue")
    }
    if (loading) return t("submitting")
    if (rateLimitSecondsLeft > 0) {
      return t("retryIn", { seconds: rateLimitSecondsLeft })
    }
    return t("submit")
  }

  const title =
    step === "code"
      ? t("codeTitle")
      : step === "password"
        ? t("passwordTitle")
        : t("title")

  const subtitle =
    step === "code"
      ? t("codeSubtitle")
      : step === "password"
        ? t("passwordSubtitle")
        : t("emailStepSubtitle")

  const isSubmitBlocked =
    step === "email"
      ? isEmailSubmitBlocked
      : step === "code"
        ? isCodeSubmitBlocked
        : isPasswordSubmitBlocked

  return (
    <div className="relative min-h-screen flex font-sans">
      <div className="absolute right-3 top-3 z-50 md:right-4 md:top-4">
        <LanguageSwitcher />
      </div>
      <div className="hidden lg:flex flex-1 bg-vo-magenta text-white flex-col justify-center px-16 gap-8">
        <div className="flex flex-col gap-8 lg:gap-10">
          <ProductBrand
            layout="inline"
            tone="onDark"
            density="authMarketing"
          />

          <h1 className="text-[40px] font-bold leading-[1.2]">
            {t("brandTitle")}
          </h1>
          <p className="text-lg text-white/80 leading-normal whitespace-pre-line">
            {t("brandSubtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-base">{t("feature1")}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-base">{t("feature2")}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-base">{t("feature3")}</span>
          </div>
        </div>
      </div>

      <div className="hidden md:flex lg:hidden fixed top-0 left-0 right-0 bg-vo-magenta text-white h-[120px] items-center justify-between px-8 gap-4 z-10">
        <ProductBrand
          layout="inline"
          tone="onDark"
          density="authMarketing"
        />
        <p className="text-sm text-white/80">{t("tabletTitle")}</p>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-background px-6 md:px-10 lg:px-12 py-6 md:py-40 lg:py-0 md:max-w-full lg:max-w-[560px]">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="ambient-orb ambient-orb--green right-[-120px] top-[-80px] h-[360px] w-[360px]" />
          <div className="ambient-orb ambient-orb--violet bottom-[-120px] left-[-100px] h-[340px] w-[340px]" />
        </div>
        <div className="glass-iridescent-card glass-edge-highlight w-full rounded-2xl p-6 md:max-w-[500px] md:p-8 lg:max-w-[420px]">
          <div className="md:hidden w-full flex justify-center mb-5">
            <AuthBrand size="mobile-register" variant="light-secondary" />
          </div>

          <div className="flex flex-col gap-5 md:gap-5 lg:gap-6">
            <div className="flex flex-col items-center md:items-start gap-1 md:gap-1.5 lg:gap-2 text-center md:text-left">
              <p
                data-testid="auth-register-step"
                data-step={step}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                aria-live="polite"
              >
                {t("stepOf", {
                  current: STEP_NUMBER[step],
                  total: TOTAL_STEPS,
                })}
              </p>
              <h2 className="text-[22px] md:text-2xl lg:text-[28px] font-bold text-foreground">
                {title}
              </h2>
              <p className="text-sm md:text-sm lg:text-base text-muted-foreground">
                {subtitle}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-5"
              data-testid="auth-register-form"
            >
              <div className="flex flex-col gap-3.5 md:gap-4">
                {step === "email" && (
                  <Input
                    label={t("emailLabel")}
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder={t("emailPlaceholder")}
                    required
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    disabled={isEmailSubmitBlocked}
                    testId="auth-register-email"
                  />
                )}

                {step === "code" && (
                  <OtpCodeInput
                    label={t("codeLabel")}
                    name="code"
                    value={formData.code}
                    onCodeChange={handleCodeChange}
                    error={errors.code}
                    disabled={isCodeSubmitBlocked}
                    testId="auth-register-code"
                    digitAriaLabel={(current, total) =>
                      t("codeDigitAria", { current, total })
                    }
                  />
                )}

                {step === "password" && (
                  <>
                    <Input
                      label={t("passwordLabel")}
                      type={showPasswords ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      placeholder={t("passwordPlaceholder")}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      error={errors.password}
                      disabled={isPasswordSubmitBlocked}
                      testId="auth-register-password"
                    />

                    <Input
                      label={t("confirmPasswordLabel")}
                      type={showPasswords ? "text" : "password"}
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder={t("confirmPasswordPlaceholder")}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      error={errors.confirmPassword}
                      disabled={isPasswordSubmitBlocked}
                      testId="auth-register-confirm-password"
                    />

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showPasswords"
                        checked={showPasswords}
                        onChange={(e) => setShowPasswords(e.target.checked)}
                        disabled={isPasswordSubmitBlocked}
                        className="h-4 w-4 rounded border-input accent-vo-magenta focus:ring-vo-magenta"
                        aria-label={t("showPasswordsAria")}
                      />
                      <label
                        htmlFor="showPasswords"
                        className="text-xs md:text-[13px] lg:text-[13px] text-foreground cursor-pointer"
                      >
                        {t("showPasswords")}
                      </label>
                    </div>
                  </>
                )}
              </div>

              <Button
                type="submit"
                variant="secondary"
                disabled={isSubmitBlocked}
                data-testid="auth-register-submit"
              >
                {submitLabel()}
              </Button>
            </form>

            {step === "code" && (
              <div className="flex flex-col items-center gap-2 text-[13px] md:text-sm">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResendBlocked}
                  data-testid="auth-register-resend"
                  className="font-medium text-vo-magenta hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                >
                  {resending
                    ? t("resendingCode")
                    : resendSecondsLeft > 0
                      ? t("resendIn", { seconds: resendSecondsLeft })
                      : t("resendCode")}
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  {t("resendLimitHint")}
                </p>
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  data-testid="auth-register-change-email"
                  className="text-muted-foreground hover:underline"
                >
                  {t("changeEmail")}
                </button>
              </div>
            )}

            {step === "password" && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleBackToCode}
                  data-testid="auth-register-back"
                  className="text-[13px] font-medium text-vo-magenta hover:underline md:text-sm"
                >
                  {t("back")}
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-1 text-[13px] md:text-[13px] lg:text-sm">
              <span className="text-muted-foreground">{t("hasAccount")}</span>
              <Link
                href="/auth/iniciar-sesion"
                className="font-medium text-vo-magenta hover:underline"
              >
                {t("loginLink")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Snackbar
        open={!!message}
        onClose={handleCloseSnackbar}
        variant={message?.type === "error" ? "error" : "success"}
        message={message?.text ?? ""}
      />
    </div>
  )
}
