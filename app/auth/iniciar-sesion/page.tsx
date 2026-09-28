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
import { AtSign, Eye, EyeOff, Lock } from "lucide-react"
import Input from "@/components/auth/Input"
import Button from "@/components/auth/Button"
import {
  AUTH_FIELD_LABEL_CLASS,
  AUTH_LINK_CLASS,
  AUTH_SUBTITLE_CLASS,
  AUTH_TITLE_CLASS,
  AuthSplitShell,
} from "@/components/auth/AuthSplitShell"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"
import { csrfHeaders } from "@/lib/auth/csrf-client"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"
import {
  getSsoErrorTranslationKey,
  isKnownSsoErrorCode,
  resolveSsoQueryErrorCode,
} from "@/lib/auth/sso-errors"
import { LinkedInLoginButton } from "@/components/auth/LinkedInLoginButton"
import { resolveAuthRedirectDestination } from "@/lib/auth/internal-path"

const REMEMBER_EMAIL_STORAGE_KEY = "applicantree-login-remember-email"

const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : ""

interface LoginFormState {
  email: string
  password: string
}

interface SnackbarState {
  type: "success" | "error"
  text: string
}

export default function IniciarSesion() {
  const router = useRouter()
  const t = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const tValidation = useTranslations("Validation")
  const tErrors = useTranslations("Errors")
  const [formData, setFormData] = useState<LoginFormState>({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<SnackbarState | null>(null)
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0)
  const [errors, setErrors] = useState<
    Partial<Record<keyof LoginFormState, string>>
  >({})

  const persistRememberedEmail = (email: string, remember: boolean) => {
    if (typeof window === "undefined") return
    if (remember && email.trim()) {
      window.localStorage.setItem(REMEMBER_EMAIL_STORAGE_KEY, email.trim())
      return
    }
    window.localStorage.removeItem(REMEMBER_EMAIL_STORAGE_KEY)
  }

  const validateForm = () => {
    const newErrors: Partial<Record<keyof LoginFormState, string>> = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const rawLogin = formData.email?.trim() ?? ""
    /** Solo exigimos formato de correo si el usuario escribió algo con @ (username sin @ es válido). */
    const looksLikeEmail = rawLogin.includes("@")

    if (!rawLogin) {
      newErrors.email = tValidation("userOrEmailRequired")
    } else if (looksLikeEmail && !emailRegex.test(rawLogin)) {
      newErrors.email = tValidation("invalidEmail")
    }
    if (!formData.password) {
      newErrors.password = tValidation("passwordRequired")
    } else if (formData.password.length < 8) {
      newErrors.password = tValidation("passwordMinLength")
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCloseSnackbar = useCallback(() => {
    setMessage(null)
  }, [])

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev)
  }

  const handleRememberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextRemember = e.target.checked
    setRememberSession(nextRemember)
    persistRememberedEmail(formData.email, nextRemember)
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem(REMEMBER_EMAIL_STORAGE_KEY)
    if (!saved) return
    setRememberSession(true)
    setFormData((prev) => ({ ...prev, email: prev.email || saved }))
  }, [])

  useEffect(() => {
    if (rateLimitSecondsLeft <= 0) return
    const id = window.setInterval(() => {
      setRateLimitSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [rateLimitSecondsLeft])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const passwordReset = params.get("passwordReset")
    const logout = params.get("logout")
    /**
     * Prefer `reason` over generic `error=linkedin_sso_failed` so dedicated copy shows.
     * resolveSsoQueryErrorCode prefers `error`; here we invert for login landing.
     */
    const ssoCode =
      resolveSsoQueryErrorCode(params.get("reason"), params.get("error")) ?? ""

    if (passwordReset === "success") {
      setMessage({
        type: "success",
        text: t("login.toastPasswordReset"),
      })
    } else if (logout === "success") {
      setMessage({
        type: "success",
        text: t("login.toastLogoutSuccess"),
      })
    } else if (logout === "error") {
      setMessage({
        type: "error",
        text: t("login.toastLogoutError"),
      })
    } else if (ssoCode && isKnownSsoErrorCode(ssoCode)) {
      const ssoKey = getSsoErrorTranslationKey(ssoCode)
      setMessage({
        type: "error",
        text:
          ssoKey === "errorDescription"
            ? t("sso.errorDescription")
            : t(`sso.${ssoKey}` as "sso.errors.account_exists"),
      })
    } else if (ssoCode) {
      setMessage({
        type: "error",
        text: t("sso.errorDescription"),
      })
    } else {
      return
    }

    const url = new URL(window.location.href)
    url.searchParams.delete("passwordReset")
    url.searchParams.delete("logout")
    url.searchParams.delete("reason")
    url.searchParams.delete("error")
    const qs = url.searchParams.toString()
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${qs ? `?${qs}` : ""}`
    )
  }, [t])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const field = name as keyof LoginFormState
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === "email" && rememberSession) {
      persistRememberedEmail(value, true)
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
    setMessage(null)
  }

  const isSubmitBlocked = loading || rateLimitSecondsLeft > 0

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    if (!validateForm()) return

    persistRememberedEmail(formData.email, rememberSession)
    setLoading(true)
    try {
      const res = await fetch(`${getOrigin()}/api/auth/login`, {
        method: "POST",
        headers: await csrfHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 429) {
          setRateLimitSecondsLeft(
            parseRetryAfterSeconds(res.headers.get("retry-after"))
          )
        }
        const raw =
          data.message ||
          data.detail ||
          (res.status === 429
            ? t("login.toastRateLimited")
            : t("login.toastInvalidCredentials"))
        const text = Array.isArray(raw) ? raw[0] : raw
        setMessage({
          type: "error",
          text: typeof text === "string" ? text : String(text),
        })
        return
      }

      setMessage({ type: "success", text: t("login.toastSignedIn") })
      const from =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("from")
          : null
      router.push(resolveAuthRedirectDestination([from]))
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
    <>
      <AuthSplitShell>
        <div className="flex flex-col gap-2">
          <h2 className={AUTH_TITLE_CLASS}>{t("login.title")}</h2>
          <p className={AUTH_SUBTITLE_CLASS}>
            {t("login.subtitle")}{" "}
            <span className="hidden sm:inline">{t("login.subtitleExtended")}</span>
          </p>
        </div>

        <form
          method="post"
          action="#"
          onSubmit={handleSubmit}
          noValidate
          className="mt-7 flex flex-col gap-5"
          data-testid="auth-login-form"
        >
          <Input
            label={t("login.emailLabel")}
            labelClassName={AUTH_FIELD_LABEL_CLASS}
            type="text"
            name="email"
            placeholder={t("login.emailPlaceholder")}
            autoComplete="username"
            required
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            disabled={isSubmitBlocked}
            testId="auth-login-email"
            accent="green"
            leftIcon={<AtSign className="h-4 w-4" strokeWidth={1.75} />}
          />

          <Input
            label={t("login.passwordLabel")}
            labelClassName={AUTH_FIELD_LABEL_CLASS}
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isSubmitBlocked}
            testId="auth-login-password"
            accent="green"
            leftIcon={<Lock className="h-4 w-4" strokeWidth={1.75} />}
            labelTrailing={
              <Link
                href="/auth/olvidaste-tu-contrasena"
                className="text-xs font-medium text-vo-purple transition-colors hover:text-vo-purple-hover hover:underline"
              >
                {t("login.forgotPasswordLink")}
              </Link>
            }
            rightAction={
              <button
                type="button"
                onClick={handleTogglePassword}
                disabled={isSubmitBlocked}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple/40 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={
                  showPassword
                    ? tCommon("hidePassword")
                    : tCommon("showPassword")
                }
                data-testid="auth-login-toggle-password"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            }
          />

          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              id="rememberSession"
              checked={rememberSession}
              onChange={handleRememberChange}
              disabled={isSubmitBlocked}
              data-testid="auth-login-remember"
              className="mt-0.5 h-4 w-4 rounded border-input text-vo-purple accent-vo-purple focus:ring-2 focus:ring-vo-purple/40"
              aria-label={t("login.rememberSession")}
            />
            <span>{t("login.rememberSession")}</span>
          </label>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitBlocked}
            data-testid="auth-login-submit"
          >
            {loading
              ? t("login.submitting")
              : rateLimitSecondsLeft > 0
                ? t("login.retryIn", { seconds: rateLimitSecondsLeft })
                : t("login.submit")}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {t("login.orContinueWith")}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <LinkedInLoginButton disabled={isSubmitBlocked} />
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t("login.noAccount")}{" "}
          <Link href="/auth/registrarse" className={AUTH_LINK_CLASS}>
            {t("login.registerLong")}
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
