"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  AUTH_SUBTITLE_CLASS,
  AUTH_TITLE_CLASS,
} from "@/components/auth/AuthSplitShell"
import Button from "@/components/auth/Button"
import {
  DEFAULT_AUTH_REDIRECT,
  resolveAuthRedirectDestination,
} from "@/lib/auth/internal-path"
import {
  getSsoErrorTranslationKey,
  resolveSsoQueryErrorCode,
} from "@/lib/auth/sso-errors"
import {
  clearPersistedSsoExchangeCode,
  resolveSsoExchangeCode,
  stripSsoCodeFromLocationUrl,
} from "@/lib/auth/sso-exchange-code"
import { csrfHeaders } from "@/lib/auth/csrf-client"

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
  const queryReturnUrl = searchParams.get("returnUrl")
  const queryFrom = searchParams.get("from")

  /** Hash is client-only; null until mounted so SSR does not flash missing_code. */
  const [hashCode, setHashCode] = useState<string | null>(null)
  const [asyncErrorCode, setAsyncErrorCode] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const codeFromHash = resolveSsoExchangeCode(window.location.hash)
    setHashCode(codeFromHash)

    const cleaned = stripSsoCodeFromLocationUrl(
      window.location.href,
      window.location.pathname,
      window.location.search
    )
    window.history.replaceState({}, "", cleaned)
  }, [])

  const syncErrorCode = oauthError
    ? oauthError
    : hashCode === ""
      ? "missing_code"
      : null

  const resolvedErrorCode = syncErrorCode ?? asyncErrorCode
  const isLoading = !resolvedErrorCode && (hashCode === null || Boolean(hashCode))

  useEffect(() => {
    if (oauthError) return
    if (hashCode === null || !hashCode) return
    if (exchangedRef.current) return
    exchangedRef.current = true

    const runExchange = async () => {
      try {
        const res = await fetch(`${getOrigin()}/api/auth/sso/exchange`, {
          method: "POST",
          headers: await csrfHeaders({ "Content-Type": "application/json" }),
          credentials: "include",
          body: JSON.stringify({ code: hashCode }),
        })

        const data = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >

        if (!res.ok) {
          clearPersistedSsoExchangeCode()
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

        clearPersistedSsoExchangeCode()
        router.replace(destination)
      } catch {
        clearPersistedSsoExchangeCode()
        setAsyncErrorCode("network_error")
      }
    }

    void runExchange()
  }, [hashCode, oauthError, queryFrom, queryReturnUrl, router])

  const errorKey = resolvedErrorCode
    ? getSsoErrorTranslationKey(resolvedErrorCode)
    : "errorDescription"

  return (
    <>
      {isLoading ? (
        <div className="flex flex-col items-center gap-4 text-center" data-testid="auth-sso-loading">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-vo-purple border-t-transparent"
            role="status"
            aria-label={t("validating")}
          />
          <p className={AUTH_SUBTITLE_CLASS}>{t("validating")}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center" data-testid="auth-sso-error">
          <h1 className={AUTH_TITLE_CLASS}>{t("errorTitle")}</h1>
          <p className={AUTH_SUBTITLE_CLASS}>
            {t(errorKey as "errorDescription")}
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push("/auth/iniciar-sesion")}
            data-testid="auth-sso-back-to-login"
          >
            {t("backToSignIn")}
          </Button>
        </div>
      )}
    </>
  )
}
