"use client"

import { Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { AiDisclosureBadge } from "@/components/rrhh/AiDisclosure"

interface ComparisonHeaderProps {
  vacancyTitle?: string | null
  scoreLabel: string | null
}

export function ComparisonHeader({ vacancyTitle, scoreLabel }: ComparisonHeaderProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison")

  return (
    <header className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-white via-ats-arena/35 to-vo-purple/[0.07] p-5 shadow-sm md:p-6">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-vo-purple/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              id="profile-comparison-heading"
              className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl"
            >
              {t("title")}
            </h2>
            <AiDisclosureBadge label={t("adaptedBadge")} />
          </div>
          <p className="max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
          {vacancyTitle ? (
            <p className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-white/70 px-3 py-1.5 font-sans text-sm font-medium text-foreground backdrop-blur-sm">
              <span className="text-muted-foreground">{t("vacancyLabel")}</span>
              <span className="truncate">{vacancyTitle}</span>
            </p>
          ) : null}
        </div>
        {scoreLabel ? (
          <div className="inline-flex shrink-0 items-center gap-2.5 self-start rounded-2xl border border-vo-purple/30 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-vo-purple/12 text-vo-purple">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("scoreLabel")}
              </p>
              <p className="font-sans text-lg font-semibold text-foreground">
                {t("estimatedScore", { score: scoreLabel })}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
