"use client"

import Link from "next/link"
import { Grid3x3 } from "lucide-react"
import { useTranslations } from "next-intl"
import { ApplicanTreeLogo } from "@/components/branding/ApplicanTreeLogo"
import LanguageSwitcher from "@/components/language-switcher"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { publicOpportunitiesTheme as theme } from "@/lib/public-opportunities-theme"
import { canChangePortal } from "@/lib/roles"

interface PublicOpportunitiesNavbarProps {
  className?: string
}

export function PublicOpportunitiesNavbar({
  className = "",
}: PublicOpportunitiesNavbarProps) {
  const t = useTranslations("PublicOpportunities.navbar")
  const { user, loading } = useCurrentUser()
  const showChangePortal =
    !loading && Boolean(user) && canChangePortal(user?.role)

  return (
    <nav
      className={`relative z-40 w-full shrink-0 overflow-visible rounded-none border-0 ${theme.nav} px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8 ${className}`}
      aria-label={t("ariaMain")}
    >
      <div className={`pointer-events-none absolute inset-0 overflow-hidden ${theme.radialNav}`} />

      <div className={`relative flex items-center justify-between ${theme.shellDirectory}`}>
        <Link
          href="/portal-oportunidades"
          className={`inline-flex items-center rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2 focus-visible:ring-offset-background ${theme.accentRing}`}
          aria-label={t("ariaGoToPortal")}
        >
          <ApplicanTreeLogo className="h-14 w-auto shrink-0 sm:h-16 md:h-[4.5rem]" />
        </Link>

        <div className="relative flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher triggerClassName={theme.navAction} />
          {showChangePortal ? (
            <Link
              href="/seleccion-portal"
              className={theme.navAction}
              aria-label={t("ariaGoToSelection")}
            >
              <Grid3x3 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("changePortal")}</span>
              <span className="sm:hidden">{t("portalsShort")}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
