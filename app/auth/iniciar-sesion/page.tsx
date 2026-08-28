"use client"

import {
  useState,
  useCallback,
  useEffect,
  Suspense,
  type ChangeEvent,
  type FormEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import Input from "@/components/auth/Input"
import Button from "@/components/auth/Button"
import AuthBrand from "@/components/auth/AuthBrand"
import ProductBrand from "@/components/branding/ProductBrand"
import LanguageSwitcher from "@/components/language-switcher"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"
import { parseRetryAfterSeconds } from "@/lib/auth/retry-after"
import {
  getSsoErrorTranslationKey,
  isKnownSsoErrorCode,
  resolveSsoQueryErrorCode,
} from "@/lib/auth/sso-errors"
import { LinkedInLoginButton } from "@/components/auth/LinkedInLoginButton"

const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

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
  const tValidation = useTranslations("Validation")
  const tErrors = useTranslations("Errors")
  const [formData, setFormData] = useState<LoginFormState>({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<SnackbarState | null>(null)
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0)
  const [errors, setErrors] = useState<
    Partial<Record<keyof LoginFormState, string>>
  >({})

  const validateForm = () => {
    const newErrors: Partial<Record<keyof LoginFormState, string>> = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const rawLogin = formData.email?.trim() ?? ""
    /** Solo exigimos formato de correo si el usuario escribió algo con @ (usuario tipo `admin` no es email). */
    const looksLikeEmail = rawLogin.includes("@")
    /** Demo local: usuario `admin` + contraseña `admin` (relaja regla de longitud de contraseña). */
    const isAdminDemo =
      rawLogin.toLowerCase() === "admin" && formData.password === "admin"

    if (!rawLogin) {
      newErrors.email = tValidation("userOrEmailRequired")
    } else if (looksLikeEmail && !emailRegex.test(rawLogin)) {
      newErrors.email = tValidation("invalidEmail")
    }
    if (!formData.password) {
      newErrors.password = tValidation("passwordRequired");
    } else if (!isAdminDemo && formData.password.length < 8) {
      newErrors.password = tValidation("passwordMinLength");
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

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
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
    setMessage(null)
  }

  const isSubmitBlocked = loading || rateLimitSecondsLeft > 0

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await fetch(`${getOrigin()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await res.json().catch(() => ({}));

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
        });
        return;
      }

      setMessage({ type: "success", text: t("login.toastSignedIn") });
      const from =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("from")
          : null;
      router.push(
        from && from.startsWith("/") ? from : "/seleccion-portal"
      );
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(err) || tErrors("connection"),
      })
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex font-sans">
      <div className="absolute right-3 top-3 z-50 md:right-4 md:top-4">
        <LanguageSwitcher />
      </div>
      {/* Desktop & Tablet: Left Panel */}
      <div className="hidden md:flex md:w-80 lg:flex-1 bg-vo-purple text-white flex-col justify-center md:px-10 lg:px-16 md:gap-6 lg:gap-8">
        <div className="flex flex-col md:gap-8 lg:gap-10">
          <ProductBrand
            layout="inline"
            tone="onDark"
            density="authMarketing"
          />

          <div className="hidden lg:block">
            <h1 className="text-[40px] font-bold leading-[1.2]">
              {t.rich("login.brandTitle", { br: () => <br /> })}
            </h1>
            <p className="text-lg text-white/80 leading-normal mt-6">
              {t.rich("login.brandSubtitle", { br: () => <br /> })}
            </p>
          </div>

          <div className="lg:hidden">
            <h1 className="text-2xl font-bold leading-[1.2]">
              {t.rich("login.brandTitleSm", { br: () => <br /> })}
            </h1>
            <p className="text-sm text-white/80 leading-[1.4] mt-6">
              {t.rich("login.brandSubtitleSm", { br: () => <br /> })}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-base">{t("login.feature1")}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-base">{t("login.feature2")}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-base">{t("login.feature3")}</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-background px-6 md:px-10 lg:px-16 py-6 md:py-0 md:max-w-[448px] lg:max-w-[560px]">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="ambient-orb ambient-orb--green right-[-120px] top-[-80px] h-[360px] w-[360px]" />
          <div className="ambient-orb ambient-orb--violet bottom-[-120px] left-[-100px] h-[340px] w-[340px]" />
        </div>
        <div className="glass-iridescent-card glass-edge-highlight w-full rounded-2xl p-6 md:max-w-[400px] md:p-8 lg:max-w-[440px]">
          <div className="md:hidden w-full flex justify-center mb-6">
            <AuthBrand size="mobile-login" variant="light-primary" />
          </div>

          <div className="flex flex-col gap-6 md:gap-6 lg:gap-8">
            <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
              <h2 className="text-[22px] md:text-2xl lg:text-[28px] font-bold text-foreground">
                {t("login.title")}
              </h2>
              <p className="text-sm md:text-sm lg:text-base text-muted-foreground">
                {t("login.subtitle")}{" "}
                <span className="hidden lg:inline">{t("login.subtitleExtended")}</span>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-6"
              data-testid="auth-login-form"
            >
              <div className="flex flex-col gap-4 md:gap-4 lg:gap-5">
                <Input
                  label={t("login.emailLabel")}
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
                />

                <Input
                  label={t("login.passwordLabel")}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  disabled={isSubmitBlocked}
                  testId="auth-login-password"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPassword"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    disabled={isSubmitBlocked}
                    className="h-4 w-4 rounded border-input accent-vo-purple focus:ring-vo-purple focus:ring-2 focus:ring-offset-0"
                    aria-label={t("login.showPassword")}
                  />
                  <label
                    htmlFor="showPassword"
                    className="text-xs md:text-[13px] text-foreground cursor-pointer"
                  >
                    {t("login.showPassword")}
                  </label>
                </div>

                <div className="flex justify-center md:justify-end">
                  <Link
                    href="/auth/forgot-password"
                    className="text-[13px] font-medium text-vo-purple hover:underline"
                  >
                    {t("login.forgotPasswordLink")}
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitBlocked}
                  data-testid="auth-login-submit"
                >
                  {loading
                    ? t("login.submitting")
                    : rateLimitSecondsLeft > 0
                      ? t("login.retryIn", { seconds: rateLimitSecondsLeft })
                      : t("login.submit")}
                </Button>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {t("login.orContinueWith")}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <Suspense fallback={null}>
                    <LinkedInLoginButton disabled={isSubmitBlocked} />
                  </Suspense>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-center gap-1 text-[13px] md:text-[13px] lg:text-sm">
              <span className="text-muted-foreground">{t("login.noAccount")}</span>
              <Link
                href="/auth/registrarse"
                className="font-medium text-vo-purple hover:underline"
              >
                <span className="md:hidden">{t("login.registerShort")}</span>
                <span className="hidden md:inline">{t("login.registerLong")}</span>
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
  );
}
