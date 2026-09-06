"use client"

import {
  useState,
  useCallback,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { AlertCircle } from "lucide-react"
import Input from "@/components/auth/Input"
import Button from "@/components/auth/Button"
import AuthBrand from "@/components/auth/AuthBrand"
import ProductBrand from "@/components/branding/ProductBrand"
import LanguageSwitcher from "@/components/language-switcher"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"
import { csrfHeaders } from "@/lib/auth/csrf-client"

const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : ""

interface SnackbarState {
  type: "success" | "error"
  text: string
}

interface FormState {
  password: string
  confirmPassword: string
}

export default function RestablecerContrasenaContent() {
  const router = useRouter()
  const t = useTranslations("Auth")
  const tValidation = useTranslations("Validation")
  const tErrors = useTranslations("Errors")
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const hasToken = Boolean(token)
  const canShowForm = hasToken

  const [formData, setFormData] = useState<FormState>({
    password: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<SnackbarState | null>(null)
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  )

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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const field = name as keyof FormState
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
    setMessage(null)
  }

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!formData.password) {
      next.password = tValidation("passwordRequired")
    } else if (formData.password.length < 8) {
      next.password = tValidation("passwordMinLength")
    }
    if (formData.password !== formData.confirmPassword) {
      next.confirmPassword = tValidation("passwordsDontMatch")
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    if (!canShowForm) return
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch(`${getOrigin()}/api/auth/reset-password`, {
        method: "POST",
        headers: await csrfHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ password: formData.password, token }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 429) {
          const ra = res.headers.get("retry-after")
          const sec = ra ? parseInt(ra, 10) : 60
          setRateLimitSecondsLeft(
            Number.isFinite(sec) && sec > 0 ? sec : 60
          )
        }
        const text =
          data.message ||
          data.detail ||
          t("reset.toastResetFailed")
        setMessage({
          type: "error",
          text: Array.isArray(text) ? text[0] : text,
        })
        return
      }

      router.replace("/auth/iniciar-sesion?passwordReset=success")
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(err) || tErrors("connection"),
      })
    } finally {
      setLoading(false)
    }
  }

  if (!canShowForm) {
    return (
      <div className="relative flex min-h-screen font-sans">
        <div className="absolute right-3 top-3 z-50 md:right-4 md:top-4">
          <LanguageSwitcher />
        </div>
        <div className="hidden flex-col justify-center bg-vo-navy text-white md:flex md:w-80 md:gap-6 md:px-10 lg:flex-1 lg:gap-8 lg:px-16">
          <div className="flex flex-col md:gap-8 lg:gap-10">
            <ProductBrand
              layout="inline"
              tone="onDark"
              density="authMarketing"
            />
            <div className="hidden lg:block">
              <h1 className="text-[40px] font-bold leading-[1.2]">
                {t("reset.invalidBrandTitle")}
              </h1>
              <p className="mt-6 text-lg leading-normal text-white/80">
                {t("reset.invalidBrandSubtitle")}
              </p>
            </div>
            <div className="lg:hidden">
              <h1 className="text-2xl font-bold leading-[1.2]">
                {t("reset.invalidBrandTitle")}
              </h1>
            </div>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-6 py-6 md:max-w-[448px] md:px-10 md:py-0 lg:max-w-[560px] lg:px-16">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
            <div className="ambient-orb ambient-orb--green right-[-120px] top-[-80px] h-[360px] w-[360px]" />
            <div className="ambient-orb ambient-orb--violet bottom-[-120px] left-[-100px] h-[340px] w-[340px]" />
          </div>
          <div className="glass-iridescent-card glass-edge-highlight w-full rounded-2xl p-6 md:max-w-[360px] md:p-8 lg:max-w-[400px]">
            <div className="mb-6 flex w-full justify-center md:hidden">
              <AuthBrand size="mobile-login" variant="light-navy" />
            </div>
            <div
              className="flex flex-col items-center text-center"
              data-testid="auth-reset-invalid-link"
              role="alert"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/15">
                <AlertCircle className="h-7 w-7" aria-hidden />
              </div>
              <h2 className="mt-5 max-w-[18ch] text-balance font-sans text-[22px] font-bold leading-tight text-foreground md:text-2xl">
                {t("reset.invalidCardTitle")}
              </h2>
              <p className="mt-3 max-w-[36ch] text-pretty font-sans text-sm leading-relaxed text-muted-foreground">
                {t("reset.invalidCardBody")}
              </p>
              <div className="mt-8 flex w-full flex-col items-center gap-4">
                <Link
                  href="/auth/olvidaste-tu-contrasena"
                  className="flex h-12 w-full items-center justify-center rounded-md bg-vo-navy px-6 text-base font-medium text-white transition-colors hover:bg-vo-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-navy focus-visible:ring-offset-2"
                  data-testid="auth-reset-invalid-go-forgot"
                >
                  {t("reset.invalidGoForgot")}
                </Link>
                <Link
                  href="/auth/iniciar-sesion"
                  className="font-sans text-[13px] font-medium text-vo-navy hover:underline md:text-sm"
                  data-testid="auth-reset-invalid-back-login"
                >
                  {t("reset.backToLogin")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen font-sans">
      <div className="absolute right-3 top-3 z-50 md:right-4 md:top-4">
        <LanguageSwitcher />
      </div>
      <div className="hidden flex-col justify-center bg-vo-navy text-white md:flex md:w-80 md:gap-6 md:px-10 lg:flex-1 lg:gap-8 lg:px-16">
        <div className="flex flex-col md:gap-8 lg:gap-10">
          <ProductBrand
            layout="inline"
            tone="onDark"
            density="authMarketing"
          />

          <div className="hidden lg:block">
            <h1 className="text-[40px] font-bold leading-[1.2]">
              {t("reset.brandTitle")}
            </h1>
            <p className="mt-6 text-lg leading-normal text-white/80">
              {t("reset.brandSubtitle")}
            </p>
          </div>

          <div className="lg:hidden">
            <h1 className="text-2xl font-bold leading-[1.2]">
              {t("reset.brandTitle")}
            </h1>
            <p className="mt-6 text-sm leading-[1.4] text-white/80">
              {t("reset.brandSubtitleSm")}
            </p>
          </div>
        </div>

        <div className="hidden flex-col gap-4 lg:flex">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 text-vo-cobre"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-base">{t("reset.feature1")}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 text-vo-cobre"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-base">{t("reset.featureRecoveryLink")}</span>
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-6 py-6 md:max-w-[448px] md:px-10 md:py-0 lg:max-w-[560px] lg:px-16">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="ambient-orb ambient-orb--green right-[-120px] top-[-80px] h-[360px] w-[360px]" />
          <div className="ambient-orb ambient-orb--violet bottom-[-120px] left-[-100px] h-[340px] w-[340px]" />
        </div>
        <div className="glass-iridescent-card glass-edge-highlight w-full rounded-2xl p-6 md:max-w-[360px] md:p-8 lg:max-w-[400px]">
          <div className="mb-6 flex w-full justify-center md:hidden">
            <AuthBrand size="mobile-login" variant="light-navy" />
          </div>

          <div className="flex flex-col gap-6 md:gap-6 lg:gap-8">
            <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
              <h2 className="text-[22px] font-bold text-foreground md:text-2xl lg:text-[28px]">
                {t("reset.title")}
              </h2>
              <p className="text-sm text-muted-foreground md:text-sm lg:text-base">
                {t("reset.subtitle")}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-6"
              data-testid="auth-reset-form"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Input
                    label={t("reset.newPasswordLabel")}
                    type={showPasswords ? "text" : "password"}
                    name="password"
                    placeholder={t("reset.newPasswordPlaceholder")}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    disabled={loading}
                    testId="auth-reset-password"
                    accent="navy"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("reset.minChars")}
                  </p>
                </div>

                <Input
                  label={t("reset.confirmPasswordLabel")}
                  type={showPasswords ? "text" : "password"}
                  name="confirmPassword"
                  placeholder={t("reset.confirmPasswordPlaceholder")}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  disabled={loading}
                  testId="auth-reset-password-confirm"
                  accent="navy"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showResetPasswords"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 rounded border-input accent-vo-navy focus:ring-2 focus:ring-vo-navy focus:ring-offset-0"
                    aria-label={t("reset.showPasswords")}
                  />
                  <label
                    htmlFor="showResetPasswords"
                    className="cursor-pointer text-xs text-foreground md:text-[13px]"
                  >
                    {t("reset.showPasswords")}
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                variant="navy"
                disabled={loading || rateLimitSecondsLeft > 0}
                data-testid="auth-reset-submit"
              >
                {loading
                  ? t("reset.submitting")
                  : rateLimitSecondsLeft > 0
                    ? t("reset.retryIn", { seconds: rateLimitSecondsLeft })
                    : t("reset.submit")}
              </Button>
            </form>

            <div className="flex justify-center text-[13px] md:text-sm">
              <Link
                href="/auth/iniciar-sesion"
                className="font-medium text-vo-navy hover:underline"
              >
                {t("reset.backToLogin")}
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
