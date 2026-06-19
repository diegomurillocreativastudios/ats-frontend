"use client"

import Link from "next/link"
import { Grid3x3 } from "lucide-react"
import { useTranslations } from "next-intl"
import { AppliAiLogo } from "@/components/branding/AppliAiLogo"
import LanguageSwitcher from "@/components/language-switcher"
import { APP_NAME } from "@/lib/app-brand"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"

interface PublicOpportunitiesNavbarProps {
  className?: string
}

const navActionClassName =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 sm:px-4 text-sm font-medium text-white/88 transition-colors hover:border-white/20 hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ats-grafito"

export function PublicOpportunitiesNavbar({
  className = "",
}: PublicOpportunitiesNavbarProps) {
  const t = useTranslations("PublicOpportunities.navbar")

  return (
    <nav
      className={`relative z-40 w-full overflow-visible rounded-none border-0 border-b border-white/10 ${publicOpportunitiesTheme.panel} px-4 py-3.5 shadow-[0_12px_40px_rgba(32,33,36,0.22)] sm:px-6 sm:py-4 lg:px-8 ${className}`}
      aria-label={t("ariaMain")}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_right,rgba(164,92,64,0.18),transparent_26%)]" />

      <div className="relative flex items-center justify-between">
        <Link
          href="/portal-oportunidades"
          className="inline-flex items-center gap-3.5 rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ats-grafito sm:gap-4"
          aria-label={t("ariaGoToPortal")}
        >
          <AppliAiLogo
            variant="light"
            className="h-11 w-11 shrink-0 sm:h-12 sm:w-12 md:h-14 md:w-14"
          />

          <span className="flex min-w-0 flex-col justify-center">
            <span
              className="font-display text-xl font-bold tracking-tight leading-none text-white sm:text-2xl md:text-3xl"
              aria-label={APP_NAME}
            >
              Appli AI
            </span>
            <span className="mt-1.5 text-xs uppercase tracking-[0.22em] text-white/55 sm:text-[13px]">
              {t("portalSubtitle")}
            </span>
          </span>
        </Link>

        <div className="relative flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher tone="onDark" triggerClassName={navActionClassName} />
          <Link
            href="/seleccion-portal"
            className={navActionClassName}
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
