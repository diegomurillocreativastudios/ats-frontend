"use client"

import {
  useState,
  useCallback,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import Input from "@/components/auth/Input"
import Button from "@/components/auth/Button"
import AuthBrand from "@/components/auth/AuthBrand"
import ProductBrand from "@/components/branding/ProductBrand"
import LanguageSwitcher from "@/components/language-switcher"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"

const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : ""

interface SnackbarState {
  type: "success" | "error"
  text: string
}

export default function ForgotPasswordContent() {
  const t = useTranslations("Auth")
  const tValidation = useTranslations("Validation")
  const tErrors = useTranslations("Errors")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<SnackbarState | null>(null)
  const [error, setError] = useState("")
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0)

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
    setEmail(e.target.value)
    if (error) setError("")
    setMessage(null)
  }

  const validate = () => {
    const trimmed = email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmed) {
      setError(tValidation("emailRequired"))
      return false
    }
    if (!emailRegex.test(trimmed)) {
      setError(tValidation("invalidEmail"))
      return false
    }
    setError("")
    return true
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch(`${getOrigin()}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
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
          t("forgot.toastRequestFailed")
        setMessage({
          type: "error",
          text: Array.isArray(text) ? text[0] : text,
        })
        return
      }

      const exists = Boolean(data.exists ?? data.Exists)
      const success = Boolean(data.success ?? data.Success)
      const serverMessage =
        typeof data.message === "string"
          ? data.message
          : typeof data.Message === "string"
            ? data.Message
            : ""

      if (success && exists) {
        setMessage({
          type: "success",
          text: serverMessage || t("forgot.toastSuccess"),
        })
        return
      }

      setMessage({
        type: "error",
        text: serverMessage || t("forgot.toastNoAccount"),
      })
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(err) || tErrors("connection"),
      })
    } finally {
      setLoading(false)
    }
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
              {t.rich("forgot.brandTitle", { br: () => <br /> })}
            </h1>
            <p className="mt-6 text-lg leading-normal text-white/80">
              {t("forgot.brandSubtitle")}
            </p>
          </div>

          <div className="lg:hidden">
            <h1 className="text-2xl font-bold leading-[1.2]">
              {t.rich("forgot.brandTitle", { br: () => <br /> })}
            </h1>
            <p className="mt-6 text-sm leading-[1.4] text-white/80">
              {t("forgot.brandSubtitleSm")}
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
            <span className="text-base">{t("forgot.feature1")}</span>
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
            <span className="text-base">{t("forgot.feature2")}</span>
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
                {t("forgot.title")}
              </h2>
              <p className="text-sm text-muted-foreground md:text-sm lg:text-base">
                {t("forgot.subtitle")}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-6"
              data-testid="auth-forgot-form"
            >
              <div className="flex flex-col gap-4 md:gap-4 lg:gap-5">
                <Input
                  label={t("forgot.emailLabel")}
                  type="email"
                  name="email"
                  placeholder={t("forgot.emailPlaceholder")}
                  required
                  value={email}
                  onChange={handleChange}
                  error={error}
                  disabled={loading || rateLimitSecondsLeft > 0}
                  testId="auth-forgot-email"
                  accent="navy"
                />

                <Button
                  type="submit"
                  variant="navy"
                  disabled={loading || rateLimitSecondsLeft > 0}
                  data-testid="auth-forgot-submit"
                >
                  {loading
                    ? t("forgot.submitting")
                    : rateLimitSecondsLeft > 0
                      ? t("forgot.retryIn", { seconds: rateLimitSecondsLeft })
                      : t("forgot.submit")}
                </Button>
              </div>
            </form>

            <div className="flex justify-center text-[13px] md:text-sm">
              <Link
                href="/auth/iniciar-sesion"
                className="font-medium text-vo-navy hover:underline"
                data-testid="auth-forgot-back-login"
              >
                {t("forgot.backToLogin")}
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
