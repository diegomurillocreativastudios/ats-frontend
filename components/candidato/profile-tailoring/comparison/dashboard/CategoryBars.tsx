"use client"

import { useTranslations } from "next-intl"
import type { ProfileCategoryScore } from "@/lib/profile-comparison-helpers"

interface CategoryBarsProps {
  categories: ProfileCategoryScore[]
  variant: "current" | "adapted"
}

const BAR_COLORS = {
  current: "bg-indigo-500",
  adapted: "bg-emerald-500",
} as const

export function CategoryBars({ categories, variant }: CategoryBarsProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison.dashboard")

  return (
    <div className="space-y-3">
      <h4 className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("profileByCategory")}
      </h4>
      <ul className="space-y-2.5" role="list">
        {categories.map((category) => (
          <li key={category.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-sans text-xs text-foreground">{t(category.labelKey)}</span>
              <span className="font-sans text-xs font-semibold tabular-nums text-muted-foreground">
                {category.value}%
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted/60"
              role="progressbar"
              aria-valuenow={category.value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${t(category.labelKey)}: ${category.value}%`}
            >
              <div
                className={`h-full rounded-full ${BAR_COLORS[variant]} motion-safe:transition-all motion-safe:duration-700`}
                style={{ width: `${category.value}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
