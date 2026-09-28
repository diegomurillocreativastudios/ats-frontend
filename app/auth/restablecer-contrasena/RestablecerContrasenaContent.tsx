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
import { AlertCircle, Lock } from "lucide-react"
import Input from "@/components/auth/Input"
import Button from "@/components/auth/Button"
import {
  AUTH_FIELD_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_SUBTITLE_CLASS,
  AUTH_TITLE_CLASS,
} from "@/components/auth/AuthSplitShell"
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
      <div
        className="flex flex-col items-center text-center"
        data-testid="auth-reset-invalid-link"
        role="alert"
      >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/15">
            <AlertCircle className="h-7 w-7" aria-hidden />
          </div>
          <h2 className={`mt-5 max-w-[18ch] text-balance ${AUTH_TITLE_CLASS}`}>
            {t("reset.invalidCardTitle")}
          </h2>
          <p className={`mt-3 max-w-[36ch] text-pretty leading-relaxed ${AUTH_SUBTITLE_CLASS}`}>
            {t("reset.invalidCardBody")}
          </p>
          <div className="mt-8 flex w-full flex-col items-center gap-4">
            <Link
              href="/auth/olvidaste-tu-contrasena"
              className="flex h-12 w-full items-center justify-center rounded-md bg-vo-purple px-6 text-base font-medium text-white transition-colors hover:bg-vo-purple/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple/40 focus-visible:ring-offset-2"
              data-testid="auth-reset-invalid-go-forgot"
            >
              {t("reset.invalidGoForgot")}
            </Link>
            <Link
              href="/auth/iniciar-sesion"
              className={AUTH_LINK_CLASS}
              data-testid="auth-reset-invalid-back-login"
            >
              {t("reset.backToLogin")}
            </Link>
          </div>
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="flex flex-col gap-2">
          <h2 className={AUTH_TITLE_CLASS}>{t("reset.title")}</h2>
          <p className={AUTH_SUBTITLE_CLASS}>{t("reset.subtitle")}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-7 flex flex-col gap-5"
          data-testid="auth-reset-form"
        >
          <div className="flex flex-col gap-1">
            <Input
              label={t("reset.newPasswordLabel")}
              labelClassName={AUTH_FIELD_LABEL_CLASS}
              type={showPasswords ? "text" : "password"}
              name="password"
              placeholder={t("reset.newPasswordPlaceholder")}
              required
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              disabled={loading}
              testId="auth-reset-password"
              accent="green"
              leftIcon={<Lock className="h-4 w-4" strokeWidth={1.75} />}
            />
            <p className="text-xs text-slate-500">{t("reset.minChars")}</p>
          </div>

          <Input
            label={t("reset.confirmPasswordLabel")}
            labelClassName={AUTH_FIELD_LABEL_CLASS}
            type={showPasswords ? "text" : "password"}
            name="confirmPassword"
            placeholder={t("reset.confirmPasswordPlaceholder")}
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            disabled={loading}
            testId="auth-reset-password-confirm"
            accent="green"
            leftIcon={<Lock className="h-4 w-4" strokeWidth={1.75} />}
          />

          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              id="showResetPasswords"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-input text-vo-purple accent-vo-purple focus:ring-2 focus:ring-vo-purple/40"
              aria-label={t("reset.showPasswords")}
            />
            <span>{t("reset.showPasswords")}</span>
          </label>

          <Button
            type="submit"
            variant="primary"
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

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/auth/iniciar-sesion" className={AUTH_LINK_CLASS}>
            {t("reset.backToLogin")}
          </Link>
        </p>
      </div>

      <Snackbar
        open={!!message}
        onClose={handleCloseSnackbar}
        variant={message?.type === "error" ? "error" : "success"}
        message={message?.text ?? ""}
      />
    </>
  )
}
