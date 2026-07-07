"use client"

import { useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Linkedin } from "lucide-react"
import Button from "@/components/auth/Button"
import { isInternalPath } from "@/lib/auth/internal-path"

interface LinkedInLoginButtonProps {
  className?: string
  disabled?: boolean
}

const getApiBaseUrl = () => (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")

export function LinkedInLoginButton({
  className = "",
  disabled = false,
}: LinkedInLoginButtonProps) {
  const t = useTranslations("Auth.login")
  const searchParams = useSearchParams()

  const handleLinkedInLogin = useCallback(() => {
    const apiBaseUrl = getApiBaseUrl()
    if (!apiBaseUrl) return

    const from = searchParams.get("from")
    const loginUrl = new URL(`${apiBaseUrl}/api/auth/linkedin/login`)

    if (isInternalPath(from)) {
      loginUrl.searchParams.set("returnUrl", from.trim())
    }

    window.location.href = loginUrl.toString()
  }, [searchParams])

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || !getApiBaseUrl()}
      onClick={handleLinkedInLogin}
      className={className}
      data-testid="auth-linkedin-login"
      aria-label={t("continueWithLinkedIn")}
    >
      <Linkedin className="h-5 w-5" aria-hidden />
      {t("continueWithLinkedIn")}
    </Button>
  )
}
