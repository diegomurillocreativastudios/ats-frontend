"use client"

import {
  useState,
  useCallback,
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
import Snackbar from "@/components/ui/Snackbar"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

interface RegisterFormState {
  email: string
  password: string
  confirmPassword: string
}

interface SnackbarState {
  type: "success" | "error"
  text: string
}

const getRegisterErrorMessage = (
  err: unknown,
  t: ReturnType<typeof useTranslations<"Auth.register">>
) => {
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>
    if (e.status === 409) return t("errors.emailTaken")
    if (typeof e.status === "number" && e.status >= 500) return t("errors.server")
  }
  return getApiErrorMessage(err) || t("errors.generic")
}

export default function Registrarse() {
  const t = useTranslations("Auth.register")
  const tValidation = useTranslations("Validation")
  const router = useRouter()
  const [formData, setFormData] = useState<RegisterFormState>({
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<SnackbarState | null>(null)
  const [errors, setErrors] = useState<
    Partial<Record<keyof RegisterFormState, string>>
  >({})

  const handleCloseSnackbar = useCallback(() => {
    setMessage(null)
  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    const field = name as keyof RegisterFormState
    setFormData((prev) => ({
      ...prev,
      [field]: type === "checkbox" ? checked : value,
    }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
    setMessage(null)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setErrors({});

    if (formData.password !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: tValidation("passwordsDontMatch") }));
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/register", {
        email: formData.email,
        password: formData.password
      });
      setMessage({ type: "success", text: t("toastSuccess") });
      setTimeout(() => {
        router.push("/auth/iniciar-sesion");
      }, 2000);
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: getRegisterErrorMessage(err, t),
      })
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
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
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-base">{t("feature1")}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-base">{t("feature2")}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <div className="flex-1 flex items-center justify-center bg-background px-6 md:px-10 lg:px-12 py-6 md:py-40 lg:py-0 md:max-w-full lg:max-w-[560px]">
        <div className="w-full md:max-w-[500px] lg:max-w-[420px]">
          <div className="md:hidden w-full flex justify-center mb-5">
            <AuthBrand size="mobile-register" variant="light-secondary" />
          </div>

          <div className="flex flex-col gap-5 md:gap-5 lg:gap-6">
            <div className="flex flex-col items-center md:items-start gap-1 md:gap-1.5 lg:gap-2 text-center md:text-left">
              <h2 className="text-[22px] md:text-2xl lg:text-[28px] font-bold text-foreground">
                {t("title")}
              </h2>
              <p className="text-sm md:text-sm lg:text-base text-muted-foreground">
                {t("subtitle")}{" "}
                <span className="hidden lg:inline">{t("subtitleExtended")}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-3.5 md:gap-4">
                <Input
                  label={t("emailLabel")}
                  type="email"
                  name="email"
                  placeholder={t("emailPlaceholder")}
                  required
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  disabled={loading}
                />

                <Input
                  label={t("passwordLabel")}
                  type={showPasswords ? "text" : "password"}
                  name="password"
                  placeholder={t("passwordPlaceholder")}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  disabled={loading}
                />

                <Input
                  label={t("confirmPasswordLabel")}
                  type={showPasswords ? "text" : "password"}
                  name="confirmPassword"
                  placeholder={t("confirmPasswordPlaceholder")}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  disabled={loading}
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPasswords"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                    disabled={loading}
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
              </div>

              <Button type="submit" variant="secondary" disabled={loading}>
                {loading ? t("submitting") : t("submit")}
              </Button>
            </form>

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
  );
}
