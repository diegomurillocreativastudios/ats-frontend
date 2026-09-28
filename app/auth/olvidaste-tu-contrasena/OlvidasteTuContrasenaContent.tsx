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
import { AtSign } from "lucide-react"
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

const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : ""

interface SnackbarState {
  type: "success" | "error"
  text: string
}

export default function OlvidasteTuContrasenaContent() {
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
        headers: await csrfHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
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

      const serverMessage =
        typeof data.message === "string"
          ? data.message
          : typeof data.Message === "string"
            ? data.Message
            : ""

      setMessage({
        type: "success",
        text: serverMessage || t("forgot.toastSuccess"),
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
    <>
      <AuthSplitShell>
        <div className="flex flex-col gap-2">
          <h2 className={AUTH_TITLE_CLASS}>{t("forgot.title")}</h2>
          <p className={AUTH_SUBTITLE_CLASS}>{t("forgot.subtitle")}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-7 flex flex-col gap-5"
          data-testid="auth-forgot-form"
        >
          <Input
            label={t("forgot.emailLabel")}
            labelClassName={AUTH_FIELD_LABEL_CLASS}
            type="email"
            name="email"
            placeholder={t("forgot.emailPlaceholder")}
            required
            value={email}
            onChange={handleChange}
            error={error}
            disabled={loading || rateLimitSecondsLeft > 0}
            testId="auth-forgot-email"
            accent="green"
            leftIcon={<AtSign className="h-4 w-4" strokeWidth={1.75} />}
          />

          <Button
            type="submit"
            variant="primary"
            disabled={loading || rateLimitSecondsLeft > 0}
            data-testid="auth-forgot-submit"
          >
            {loading
              ? t("forgot.submitting")
              : rateLimitSecondsLeft > 0
                ? t("forgot.retryIn", { seconds: rateLimitSecondsLeft })
                : t("forgot.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link
            href="/auth/iniciar-sesion"
            className={AUTH_LINK_CLASS}
            data-testid="auth-forgot-back-login"
          >
            {t("forgot.backToLogin")}
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
