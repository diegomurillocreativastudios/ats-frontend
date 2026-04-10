"use client"

import {
  useState,
  useCallback,
  type ChangeEvent,
  type FormEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Input from "@/components/auth/Input"
import Button from "@/components/auth/Button"
import AuthBrand from "@/components/auth/AuthBrand"
import Snackbar from "@/components/ui/Snackbar"
import { getApiErrorMessage } from "@/lib/api-error"

const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : ""

interface SnackbarState {
  type: "success" | "error"
  text: string
}

export default function ForgotPasswordContent() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<SnackbarState | null>(null)
  const [error, setError] = useState("")

  const handleCloseSnackbar = useCallback(() => {
    setMessage(null)
  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (error) setError("")
    setMessage(null)
  }

  const validate = () => {
    const trimmed = email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!trimmed) {
      setError("El correo electrónico es requerido")
      return false
    }
    if (!emailRegex.test(trimmed)) {
      setError("Correo electrónico inválido")
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
        const text =
          data.message ||
          data.detail ||
          "No se pudo enviar la solicitud. Intenta de nuevo."
        setMessage({
          type: "error",
          text: Array.isArray(text) ? text[0] : text,
        })
        return
      }

      const exists = Boolean(data.exists ?? data.Exists)
      const success = Boolean(data.success ?? data.Success)

      if (exists && success) {
        router.push(
          `/restablecer-contrasena?email=${encodeURIComponent(email.trim())}`
        )
        return
      }

      const serverMessage =
        typeof data.message === "string"
          ? data.message
          : typeof data.Message === "string"
            ? data.Message
            : ""

      setMessage({
        type: "error",
        text:
          serverMessage ||
          "No hay una cuenta registrada con este correo. Verificá el dato o registrate.",
      })
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
              Recuperá el acceso
              <br />a tu cuenta
            </h1>
            <p className="mt-6 text-lg leading-normal text-white/80">
              Verificamos tu correo y en el siguiente paso definís una nueva
              contraseña.
            </p>
          </div>

          <div className="lg:hidden">
            <h1 className="text-2xl font-bold leading-[1.2]">
              Recuperá el acceso
              <br />a tu cuenta
            </h1>
            <p className="mt-6 text-sm leading-[1.4] text-white/80">
              Verificamos tu correo y seguís con tu nueva contraseña.
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
            <span className="text-base">Correo verificado en el sistema</span>
          </div>
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
            <span className="text-base">Contraseña segura (mín. 8 caracteres)</span>
          </div>
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
                ¿Olvidaste tu contraseña?
              </h2>
              <p className="text-sm text-muted-foreground md:text-sm lg:text-base">
                Ingresá el correo de tu cuenta. Si está registrado, continuás
                para elegir una nueva contraseña.
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
                  label="Correo electrónico"
                  type="email"
                  name="email"
                  placeholder="nombre@empresa.com"
                  required
                  value={email}
                  onChange={handleChange}
                  error={error}
                  disabled={loading}
                  testId="auth-forgot-email"
                  accent="navy"
                />

                <Button
                  type="submit"
                  variant="navy"
                  disabled={loading}
                  data-testid="auth-forgot-submit"
                >
                  {loading ? "Verificando..." : "Continuar"}
                </Button>
              </div>
            </form>

            <div className="flex justify-center text-[13px] md:text-sm">
              <Link
                href="/auth/iniciar-sesion"
                className="font-medium text-vo-navy hover:underline"
                data-testid="auth-forgot-back-login"
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
