"use client"

import {
  useState,
  useCallback,
  type ChangeEvent,
  type FormEvent,
} from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, AlertCircle } from "lucide-react"
import Input from "@/components/auth/Input"
import Button from "@/components/auth/Button"
import AuthBrand from "@/components/auth/AuthBrand"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"

const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : ""

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

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
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const emailFromQuery = searchParams.get("email")?.trim() ?? ""

  const hasToken = Boolean(token)
  const emailValidForFlow =
    Boolean(emailFromQuery) && isValidEmail(emailFromQuery)
  /**
   * Flujo in-app: email en query sin token (tras forgot-password con exists/success).
   * Si hay token (enlace mail), el backend solo usa token — no mezclar con email en el body.
   */
  const isEmailFlow = emailValidForFlow && !hasToken
  const canShowForm = hasToken || isEmailFlow

  const [formData, setFormData] = useState<FormState>({
    password: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState<SnackbarState | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  )

  const handleCloseSnackbar = useCallback(() => {
    setMessage(null)
  }, [])

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
      next.password = "La contraseña es requerida"
    } else if (formData.password.length < 8) {
      next.password = "La contraseña debe tener al menos 8 caracteres"
    }
    if (formData.password !== formData.confirmPassword) {
      next.confirmPassword = "Las contraseñas no coinciden"
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
      const body = hasToken
        ? { password: formData.password, token }
        : { password: formData.password, email: emailFromQuery }

      const res = await fetch(`${getOrigin()}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const text =
          data.message ||
          data.detail ||
          "No se pudo restablecer la contraseña."
        setMessage({
          type: "error",
          text: Array.isArray(text) ? text[0] : text,
        })
        return
      }

      setSuccess(true)
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text:
          getApiErrorMessage(err) || "Error de conexión. Intenta de nuevo.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoToLogin = () => {
    router.push("/auth/iniciar-sesion")
  }

  const noopChange = () => {}

  if (!canShowForm) {
    return (
      <div className="flex min-h-screen font-inter">
        <div className="hidden flex-col justify-center bg-vo-navy text-white md:flex md:w-80 md:gap-6 md:px-10 lg:flex-1 lg:gap-8 lg:px-16">
          <div className="flex flex-col md:gap-6 lg:gap-6">
            <div className="flex items-center md:gap-3 lg:gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/10 text-[22px] font-bold lg:h-14 lg:w-14 lg:rounded-xl lg:text-[32px]">
                C
              </div>
              <div className="text-xl font-bold leading-none lg:text-[32px]">
                ATS App
              </div>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-[40px] font-bold leading-[1.2]">
                Enlace inválido
              </h1>
              <p className="mt-6 text-lg leading-normal text-white/80">
                Iniciá el restablecimiento desde &quot;¿Olvidaste tu
                contraseña?&quot;.
              </p>
            </div>
            <div className="lg:hidden">
              <h1 className="text-2xl font-bold leading-[1.2]">
                Enlace inválido
              </h1>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center bg-background px-6 py-10 md:max-w-[448px] md:px-10 lg:max-w-[560px] lg:px-16">
          <div className="w-full max-w-[400px]">
            <div className="mb-6 flex justify-center md:hidden">
              <AuthBrand size="mobile-login" variant="light-navy" />
            </div>
            <div
              className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center md:text-left"
              data-testid="auth-reset-invalid-link"
              role="alert"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-8 w-8" aria-hidden />
              </div>
              <h2 className="font-inter text-[22px] font-bold text-foreground md:text-2xl">
                No pudimos abrir el restablecimiento
              </h2>
              <p className="font-inter text-sm text-muted-foreground">
                Falta un correo verificado o un token válido. Volvé a &quot;¿Olvidaste
                tu contraseña?&quot; y completá el paso anterior.
              </p>
              <div className="flex w-full flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                <Link
                  href="/auth/forgot-password"
                  className="font-inter text-center text-sm font-medium text-vo-navy hover:underline"
                >
                  Ir a olvidé mi contraseña
                </Link>
                <span className="hidden text-muted-foreground sm:inline">·</span>
                <Link
                  href="/auth/iniciar-sesion"
                  className="font-inter text-center text-sm font-medium text-vo-navy hover:underline"
                >
                  Volver a iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen font-inter">
        <div className="hidden flex-col justify-center bg-vo-navy text-white md:flex md:w-80 md:gap-6 md:px-10 lg:flex-1 lg:gap-8 lg:px-16">
          <div className="flex flex-col md:gap-6 lg:gap-6">
            <div className="flex items-center md:gap-3 lg:gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/10 text-[22px] font-bold lg:h-14 lg:w-14 lg:rounded-xl lg:text-[32px]">
                C
              </div>
              <div className="text-xl font-bold leading-none lg:text-[32px]">
                ATS App
              </div>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-[40px] font-bold leading-[1.2]">
                Contraseña actualizada
              </h1>
              <p className="mt-6 text-lg leading-normal text-white/80">
                Ya podés iniciar sesión con tu nueva contraseña.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center bg-background px-6 py-10 md:max-w-[448px] md:px-10 lg:max-w-[560px] lg:px-16">
          <div className="w-full md:max-w-[360px] lg:max-w-[400px]">
            <div className="mb-6 flex justify-center md:hidden">
              <AuthBrand size="mobile-login" variant="light-navy" />
            </div>
            <div
              className="flex flex-col items-center gap-6 text-center md:items-start md:text-left"
              role="status"
              aria-live="polite"
              data-testid="auth-reset-success"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-vo-navy/10 text-vo-navy">
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              </div>
              <div>
                <h2 className="font-inter text-[22px] font-bold text-foreground md:text-2xl lg:text-[28px]">
                  Listo
                </h2>
                <p className="mt-2 font-inter text-sm text-muted-foreground md:text-base">
                  Tu contraseña se actualizó correctamente. Iniciá sesión con la
                  nueva clave.
                </p>
              </div>
              <Button type="button" variant="navy" onClick={handleGoToLogin}>
                Ir a iniciar sesión
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen font-inter">
      <div className="hidden flex-col justify-center bg-vo-navy text-white md:flex md:w-80 md:gap-6 md:px-10 lg:flex-1 lg:gap-8 lg:px-16">
        <div className="flex flex-col md:gap-6 lg:gap-6">
          <div className="flex items-center md:gap-3 lg:gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/10 text-[22px] font-bold lg:h-14 lg:w-14 lg:rounded-xl lg:text-[32px]">
              C
            </div>
            <div className="text-xl font-bold leading-none lg:text-[32px]">
              ATS App
            </div>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-[40px] font-bold leading-[1.2]">
              Nueva contraseña
            </h1>
            <p className="mt-6 text-lg leading-normal text-white/80">
              {isEmailFlow
                ? "Tu correo ya está verificado. Elegí una contraseña segura."
                : "Elegí una contraseña segura que no uses en otros sitios."}
            </p>
          </div>

          <div className="lg:hidden">
            <h1 className="text-2xl font-bold leading-[1.2]">
              Nueva contraseña
            </h1>
            <p className="mt-6 text-sm leading-[1.4] text-white/80">
              {isEmailFlow
                ? "Correo verificado. Completá tu nueva clave."
                : "Elegí una contraseña segura."}
            </p>
          </div>
        </div>

        <div className="hidden flex-col gap-4 lg:flex">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 text-vo-sky"
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
            <span className="text-base">Mínimo 8 caracteres</span>
          </div>
          {isEmailFlow ? (
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-vo-sky"
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
              <span className="text-base">Correo verificado</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-vo-sky"
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
              <span className="text-base">Enlace de recuperación</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-6 py-6 md:max-w-[448px] md:px-10 md:py-0 lg:max-w-[560px] lg:px-16">
        <div className="w-full md:max-w-[360px] lg:max-w-[400px]">
          <div className="mb-6 flex w-full justify-center md:hidden">
            <AuthBrand size="mobile-login" variant="light-navy" />
          </div>

          <div className="flex flex-col gap-6 md:gap-6 lg:gap-8">
            <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
              <h2 className="text-[22px] font-bold text-foreground md:text-2xl lg:text-[28px]">
                Restablecer contraseña
              </h2>
              <p className="text-sm text-muted-foreground md:text-sm lg:text-base">
                {isEmailFlow
                  ? "Tu correo ya fue verificado. Ingresá y confirmá tu nueva contraseña."
                  : "Ingresá tu nueva contraseña y confirmala."}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-6"
              data-testid="auth-reset-form"
            >
              <div className="flex flex-col gap-4">
                {isEmailFlow ? (
                  <Input
                    label="Correo electrónico"
                    type="email"
                    name="verifiedEmail"
                    value={emailFromQuery}
                    onChange={noopChange}
                    disabled
                    testId="auth-reset-email-verified"
                    accent="navy"
                  />
                ) : null}

                <Input
                  label="Nueva contraseña"
                  type={showPasswords ? "text" : "password"}
                  name="password"
                  placeholder="Mínimo 8 caracteres"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  disabled={loading}
                  testId="auth-reset-password"
                  accent="navy"
                />

                <Input
                  label="Confirmar contraseña"
                  type={showPasswords ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Repetir contraseña"
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
                    aria-label="Mostrar contraseñas"
                  />
                  <label
                    htmlFor="showResetPasswords"
                    className="cursor-pointer text-xs text-foreground md:text-[13px]"
                  >
                    Mostrar contraseñas
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                variant="navy"
                disabled={loading}
                data-testid="auth-reset-submit"
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
              </Button>
            </form>

            <div className="flex justify-center text-[13px] md:text-sm">
              <Link
                href="/auth/iniciar-sesion"
                className="font-medium text-vo-navy hover:underline"
              >
                Volver a iniciar sesión
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
