"use client"

import { useTranslations } from "next-intl"
import { PublicOpportunitiesHeroIllustration } from "@/components/public/PublicOpportunitiesHeroIllustration"
import { PublicOpportunitiesShell } from "@/components/public/PublicOpportunitiesShell"
import { PublicVacanciesExplorer } from "@/components/public/PublicVacanciesExplorer"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"

interface PublicVacanciesPageProps {
  initialQueryString?: string
}

export function PublicVacanciesPage({
  initialQueryString = "",
}: PublicVacanciesPageProps) {
  const t = useTranslations("PublicOpportunities.page")

  return (
    <PublicOpportunitiesShell
      id="public-opportunities-top"
      background={
        <>
          <div className={publicOpportunitiesTheme.heroGradientShort} />
          <div
            className={`absolute right-[6%] top-12 h-56 w-56 ${publicOpportunitiesTheme.orbCobre}`}
          />
        </>
      }
    >
      <div className="relative flex w-full flex-col px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <div className={publicOpportunitiesTheme.shellDirectory}>
          <header className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-center md:justify-between md:gap-10">
            <div className="@container min-w-0 max-w-3xl flex-1 space-y-5">
              <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {t.rich("heroTitle", {
                  portal: (chunks) => (
                    <strong className="block w-fit max-w-full whitespace-nowrap font-serif font-bold italic text-ats-cobre [font-size:clamp(1.55rem,8.8cqi,1.05em)]">
                      {chunks}
                    </strong>
                  ),
                })}
              </h1>
              <p className="text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
                {t("heroBody")}
              </p>
            </div>

            <div
              className={publicOpportunitiesTheme.heroIllustrationFrame}
              aria-hidden
            >
              <PublicOpportunitiesHeroIllustration
                className={publicOpportunitiesTheme.heroIllustrationImage}
              />
            </div>
          </header>

          <PublicVacanciesExplorer initialQueryString={initialQueryString} />
        </div>
      </div>
    </PublicOpportunitiesShell>
  )
}
