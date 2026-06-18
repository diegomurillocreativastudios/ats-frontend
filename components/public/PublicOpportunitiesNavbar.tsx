"use client"

import Image from "next/image"
import Link from "next/link"
import { Grid3x3 } from "lucide-react"
import { useTranslations } from "next-intl"
import LanguageSwitcher from "@/components/language-switcher"

interface PublicOpportunitiesNavbarProps {
  className?: string
}

const navActionClassName =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 sm:px-4 text-sm font-medium text-white/88 transition-colors hover:border-white/20 hover:bg-white/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e2744]"

export function PublicOpportunitiesNavbar({
  className = "",
}: PublicOpportunitiesNavbarProps) {
  const t = useTranslations("PublicOpportunities.navbar")

  return (
    <nav
      className={`relative z-40 w-full overflow-visible rounded-none border-0 border-b border-white/10 bg-[linear-gradient(180deg,rgba(35,45,76,0.94)_0%,rgba(19,27,50,0.96)_100%)] px-4 py-3 shadow-[0_12px_40px_rgba(7,12,27,0.22)] backdrop-blur sm:px-6 lg:px-8 ${className}`}
      aria-label={t("ariaMain")}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_right,rgba(199,50,119,0.18),transparent_26%)]" />

      <div className="relative flex items-center justify-between">
        <Link
          href="/portal-oportunidades"
          className="inline-flex items-center gap-3 rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e2744]"
          aria-label={t("ariaGoToPortal")}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/95 shadow-[0_10px_30px_rgba(255,255,255,0.08)]">
            <Image
              src="/visible-icon.webp"
              alt={t("logoIconAlt")}
              width={42}
              height={31}
              className="h-auto w-[34px] object-contain"
              priority
            />
          </span>

          <span className="flex min-w-0 flex-col">
            <Image
              src="/visible-text.png"
              alt="ATS"
              width={735}
              height={201}
              className="h-auto w-[122px] object-contain brightness-0 invert sm:w-[142px]"
              priority
            />
            <span className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/52">
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
