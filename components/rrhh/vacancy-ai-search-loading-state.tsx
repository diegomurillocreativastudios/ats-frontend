"use client"

import { useEffect, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { AiDisclosurePillProgress } from "@/components/rrhh/AiDisclosure"
import {
  APPLY_LOADING_TICK_MS,
  getLoadingBarPercentForTypicalDuration,
  VACANCY_SMART_PRELIMINARY_SEARCH_TYPICAL_MS,
} from "@/lib/apply-loading-bar"
import { getVacancyPreliminarySearchStepKeyFromPercent } from "@/lib/vacancy-preliminary-search-progress-status"

const SEARCH_SKELETON_ROWS = 3

export interface VacancyAiSearchLoadingStateProps {
  compact?: boolean
}

/**
 * Loading UI for the vacancy preliminary AI search: spinner, live step copy,
 * a moving progress bar, and pulsing candidate-card skeletons.
 */
export function VacancyAiSearchLoadingState({
  compact = false,
}: VacancyAiSearchLoadingStateProps) {
  const t = useTranslations("RecruiterPortal.vacancies.matching")
  const [percent, setPercent] = useState(4)

  useEffect(() => {
    const startedAt = Date.now()
    const tick = () =>
      setPercent(
        getLoadingBarPercentForTypicalDuration(
          Date.now() - startedAt,
          VACANCY_SMART_PRELIMINARY_SEARCH_TYPICAL_MS
        )
      )
    tick()
    const id = window.setInterval(tick, APPLY_LOADING_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  const stepKey = getVacancyPreliminarySearchStepKeyFromPercent(percent)

  return (
    <div
      className={`flex flex-col items-center justify-center gap-5 text-center ${compact ? "py-8" : "py-10"}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t("aria.searchProgress")}
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full bg-vo-purple/25 motion-safe:animate-ping"
          aria-hidden
        />
        <span
          className="relative flex h-14 w-14 items-center justify-center rounded-full border border-vo-purple/35 bg-vo-purple/10"
          aria-hidden
        >
          <Loader2 className="h-6 w-6 text-vo-purple motion-safe:animate-spin" />
        </span>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-1.5 px-1">
        <p className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-vo-purple motion-safe:animate-pulse" aria-hidden />
          {t("updatingSearchEllipsis")}
        </p>
        <p className="font-sans text-sm text-muted-foreground">{t(stepKey)}</p>
        <p className="font-sans text-xs text-muted-foreground/90">
          {t("searchLoadingHint")}
        </p>
      </div>

      <div className="w-full max-w-md px-1">
        <AiDisclosurePillProgress
          percent={percent}
          className="mt-0!"
          aria-label={t("aria.searchProgress")}
        />
      </div>

      <ul className="flex w-full flex-col gap-3" aria-hidden>
        {Array.from({ length: SEARCH_SKELETON_ROWS }, (_, index) => (
          <li key={index}>
            <SearchResultSkeleton delayMs={index * 140} />
          </li>
        ))}
      </ul>
    </div>
  )
}

interface SearchResultSkeletonProps {
  delayMs: number
}

function SearchResultSkeleton({ delayMs }: SearchResultSkeletonProps) {
  return (
    <div
      className="rounded-xl border border-border bg-muted/25 p-5 motion-safe:animate-pulse"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-3.5 w-40 max-w-full rounded bg-muted" />
          <div className="h-3 w-56 max-w-full rounded bg-muted/80" />
        </div>
        <div className="hidden h-12 w-16 shrink-0 rounded-lg bg-muted sm:block" />
      </div>
    </div>
  )
}
