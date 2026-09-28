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
import { AtSign, Lock } from "lucide-react"
import Input from "@/components/auth/Input"
import OtpCodeInput from "@/components/auth/OtpCodeInput"
import Button from "@/components/auth/Button"
import {
  AUTH_FIELD_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_SUBTITLE_CLASS,
  AUTH_TITLE_CLASS,
  AuthSplitShell,
} from "@/components/auth/AuthSplitShell"
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
    <>
      <AuthSplitShell>
        <div className="flex flex-col gap-2">
          <p
            data-testid="auth-register-step"
            data-step={step}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
            aria-live="polite"
          >
            {t("stepOf", {
              current: STEP_NUMBER[step],
              total: TOTAL_STEPS,
            })}
          </p>
          <h2 className={AUTH_TITLE_CLASS}>{title}</h2>
          <p className={AUTH_SUBTITLE_CLASS}>{subtitle}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-7 flex flex-col gap-5"
          data-testid="auth-register-form"
        >
          {step === "email" && (
            <Input
              label={t("emailLabel")}
              labelClassName={AUTH_FIELD_LABEL_CLASS}
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
              accent="green"
              leftIcon={<AtSign className="h-4 w-4" strokeWidth={1.75} />}
            />
          )}

          {step === "code" && (
            <OtpCodeInput
              label={t("codeLabel")}
              labelClassName={AUTH_FIELD_LABEL_CLASS}
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
                labelClassName={AUTH_FIELD_LABEL_CLASS}
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
                accent="green"
                leftIcon={<Lock className="h-4 w-4" strokeWidth={1.75} />}
              />

              <Input
                label={t("confirmPasswordLabel")}
                labelClassName={AUTH_FIELD_LABEL_CLASS}
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
                accent="green"
                leftIcon={<Lock className="h-4 w-4" strokeWidth={1.75} />}
              />

              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  id="showPasswords"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                  disabled={isPasswordSubmitBlocked}
                  className="mt-0.5 h-4 w-4 rounded border-input text-vo-purple accent-vo-purple focus:ring-2 focus:ring-vo-purple/40"
                  aria-label={t("showPasswordsAria")}
                />
                <span>{t("showPasswords")}</span>
              </label>
            </>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitBlocked}
            data-testid="auth-register-submit"
          >
            {submitLabel()}
          </Button>
        </form>

        {step === "code" && (
          <div className="mt-5 flex flex-col items-center gap-2 text-sm">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResendBlocked}
              data-testid="auth-register-resend"
              className="font-semibold text-vo-purple transition-colors hover:text-vo-purple-hover hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
            >
              {resending
                ? t("resendingCode")
                : resendSecondsLeft > 0
                  ? t("resendIn", { seconds: resendSecondsLeft })
                  : t("resendCode")}
            </button>
            <p className="text-center text-xs text-slate-500">
              {t("resendLimitHint")}
            </p>
            <button
              type="button"
              onClick={handleChangeEmail}
              data-testid="auth-register-change-email"
              className="text-slate-500 transition-colors hover:text-slate-700 hover:underline"
            >
              {t("changeEmail")}
            </button>
          </div>
        )}

        {step === "password" && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={handleBackToCode}
              data-testid="auth-register-back"
              className="text-sm font-semibold text-vo-purple transition-colors hover:text-vo-purple-hover hover:underline"
            >
              {t("back")}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          {t("hasAccount")}{" "}
          <Link href="/auth/iniciar-sesion" className={AUTH_LINK_CLASS}>
            {t("loginLink")}
          </Link>
        </p>
      </AuthSplitShell>

      <Snackbar
        open={!!message}
        onClose={handleCloseSnackbar}
        variant={message?.type === "error" ? "error" : "success"}
        message={message?.text ?? ""}
      />
    </>
  )
}
