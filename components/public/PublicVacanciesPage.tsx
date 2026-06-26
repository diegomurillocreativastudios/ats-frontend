"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Sparkles } from "lucide-react"
import { PublicOpportunitiesNavbar } from "@/components/public/PublicOpportunitiesNavbar"
import { PublicVacanciesExplorer } from "@/components/public/PublicVacanciesExplorer"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"

interface PublicVacanciesPageProps {
  initialQueryString?: string
}

const panelClassName = publicOpportunitiesTheme.panel

export function PublicVacanciesPage({
  initialQueryString = "",
}: PublicVacanciesPageProps) {
  const t = useTranslations("PublicOpportunities.page")

  return (
    <div
      id="public-opportunities-top"
      className="relative min-h-screen overflow-hidden bg-ats-warm-white text-foreground"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className={`${publicOpportunitiesTheme.heroGradient}`} />
        <div className={`absolute left-[-10%] top-8 h-72 w-72 ${publicOpportunitiesTheme.orbTerracotta}`} />
        <div className={`absolute right-[2%] top-16 h-80 w-80 ${publicOpportunitiesTheme.orbCobre}`} />
        <div className={`${publicOpportunitiesTheme.heroDivider}`} />
        <div className={`absolute bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 ${publicOpportunitiesTheme.orbBottom}`} />
      </div>

      <PublicOpportunitiesNavbar className="mb-6" />

      <div className="relative flex w-full flex-col px-4 pb-6 pt-5 sm:px-6 sm:pt-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <header className={`relative overflow-hidden rounded-[36px] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12 ${panelClassName}`}>
            <div className={`absolute inset-0 ${publicOpportunitiesTheme.radialHero}`} />
            <div className="absolute -right-14 top-0 hidden h-48 w-48 rounded-full border border-border bg-muted/25 blur-2xl lg:block" />

            <div className="relative max-w-3xl space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-ats-cobre" aria-hidden />
                {t("portalTitle")}
              </p>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-[3.45rem]">
                  {t("heroTitle")}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  {t("heroBody")}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="#public-opportunities-explorer"
                  className={publicOpportunitiesTheme.cta}
                >
                  {t("exploreCta")}
                </Link>
              </div>
            </div>
          </header>

          <PublicVacanciesExplorer initialQueryString={initialQueryString} />
        </div>
      </div>
    </div>
  )
}
