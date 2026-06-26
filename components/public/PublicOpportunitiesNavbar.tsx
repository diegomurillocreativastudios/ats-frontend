"use client"

import Link from "next/link"
import { Grid3x3 } from "lucide-react"
import { useTranslations } from "next-intl"
import { ApplicanTreeLogo } from "@/components/branding/ApplicanTreeLogo"
import LanguageSwitcher from "@/components/language-switcher"
import { publicOpportunitiesTheme as theme } from "@/lib/public-opportunities-theme"

interface PublicOpportunitiesNavbarProps {
  className?: string
}

export function PublicOpportunitiesNavbar({
  className = "",
}: PublicOpportunitiesNavbarProps) {
  const t = useTranslations("PublicOpportunities.navbar")

  return (
    <nav
      className={`relative z-40 w-full overflow-visible rounded-none border-0 ${theme.nav} px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8 ${className}`}
      aria-label={t("ariaMain")}
    >
      <div className={`pointer-events-none absolute inset-0 overflow-hidden ${theme.radialNav}`} />

      <div className="relative flex items-center justify-between">
        <Link
          href="/portal-oportunidades"
          className={`inline-flex items-center gap-3.5 rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ats-cobre focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-4 ${theme.accentRing}`}
          aria-label={t("ariaGoToPortal")}
        >
          <ApplicanTreeLogo className="h-11 w-auto shrink-0 sm:h-12 md:h-14" />

          <span className="flex min-w-0 flex-col justify-center">
            <span
              className={`text-xs uppercase tracking-[0.22em] sm:text-[13px] ${theme.textSubtle}`}
            >
              {t("portalSubtitle")}
            </span>
          </span>
        </Link>

        <div className="relative flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher triggerClassName={theme.navAction} />
          <Link
            href="/seleccion-portal"
            className={theme.navAction}
            aria-label={t("ariaGoToSelection")}
          >
            <Grid3x3 className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t("changePortal")}</span>
            <span className="sm:hidden">{t("portalsShort")}</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
