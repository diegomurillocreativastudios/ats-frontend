"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import AuthBrand from "@/components/auth/AuthBrand"
import Button from "@/components/auth/Button"
import LanguageSwitcher from "@/components/language-switcher"
import {
  DEFAULT_AUTH_REDIRECT,
  resolveAuthRedirectDestination,
} from "@/lib/auth/internal-path"
import {
  getSsoErrorTranslationKey,
  resolveSsoQueryErrorCode,
} from "@/lib/auth/sso-errors"

const getOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : ""

export default function SsoSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("Auth.sso")
  const exchangedRef = useRef(false)

  const oauthError = resolveSsoQueryErrorCode(
    searchParams.get("error"),
    searchParams.get("reason")
  )
  const code = searchParams.get("code")?.trim() ?? ""
  const queryReturnUrl = searchParams.get("returnUrl")
  const queryFrom = searchParams.get("from")

  const syncErrorCode = oauthError
    ? oauthError
    : !code
      ? "missing_code"
      : null

  const [asyncErrorCode, setAsyncErrorCode] = useState<string | null>(null)
  const resolvedErrorCode = syncErrorCode ?? asyncErrorCode
  const isLoading = !resolvedErrorCode && Boolean(code)

  useEffect(() => {
    if (syncErrorCode || !code) return
    if (exchangedRef.current) return
    exchangedRef.current = true

    const runExchange = async () => {
      try {
        const res = await fetch(`${getOrigin()}/api/auth/sso/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code }),
        })

        const data = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >

        if (!res.ok) {
          const errorCode =
            (typeof data.code === "string" && data.code) ||
            (typeof data.error === "string" && data.error) ||
            "linkedin_sso_failed"
          setAsyncErrorCode(errorCode)
          return
        }

        const bodyReturnUrl =
          typeof data.returnUrl === "string" ? data.returnUrl : null

        const destination = resolveAuthRedirectDestination(
          [bodyReturnUrl, queryReturnUrl, queryFrom],
          DEFAULT_AUTH_REDIRECT
        )

        router.replace(destination)
      } catch {
        setAsyncErrorCode("network_error")
      }
    }

    void runExchange()
  }, [code, queryFrom, queryReturnUrl, router, syncErrorCode])

  const errorKey = resolvedErrorCode
    ? getSsoErrorTranslationKey(resolvedErrorCode)
    : "errorDescription"

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-6 py-10 font-sans">
      <div className="absolute right-3 top-3 z-50 md:right-4 md:top-4">
        <LanguageSwitcher />
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="ambient-orb ambient-orb--green right-[-120px] top-[-80px] h-[360px] w-[360px]" />
        <div className="ambient-orb ambient-orb--violet bottom-[-120px] left-[-100px] h-[340px] w-[340px]" />
      </div>

      <div className="glass-iridescent-card glass-edge-highlight w-full max-w-md rounded-2xl p-8 text-center">
        <div className="mb-6 flex justify-center">
          <AuthBrand size="mobile-login" variant="light-primary" />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-4" data-testid="auth-sso-loading">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
              role="status"
              aria-label={t("validating")}
            />
            <p className="text-sm text-muted-foreground">{t("validating")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4" data-testid="auth-sso-error">
            <h1 className="text-xl font-bold text-foreground">{t("errorTitle")}</h1>
            <p className="text-sm text-muted-foreground">
              {t(errorKey as "errorDescription")}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/auth/iniciar-sesion")}
              data-testid="auth-sso-back-to-login"
            >
              {t("backToSignIn")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
