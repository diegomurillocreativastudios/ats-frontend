"use client"

import { useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import Button from "@/components/auth/Button"
import { isInternalPath } from "@/lib/auth/internal-path"

interface LinkedInLoginButtonProps {
  className?: string
  disabled?: boolean
}

interface LinkedInLogoIconProps {
  className?: string
}

const LINKEDIN_BLUE = "#0A66C2"

/**
 * Official LinkedIn mark: rounded square in brand blue with white in letters.
 */
function LinkedInLogoIcon({ className }: LinkedInLogoIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
      <rect width="24" height="24" rx="3" fill={LINKEDIN_BLUE} />
      <path
        fill="#fff"
        d="M7.119 20.452H3.555V9h3.564v11.452zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zM20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286z"
      />
    </svg>
  )
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
      <LinkedInLogoIcon className="h-5 w-5 shrink-0" />
      {t("continueWithLinkedIn")}
    </Button>
  )
}
