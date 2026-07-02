"use client"

import { useTranslations } from "next-intl"
import {
  Briefcase,
  Calendar,
  Languages,
  Search,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import type { ComparisonCriterionRow } from "@/lib/profile-comparison-helpers"
import { StatusBadge } from "@/components/candidato/profile-tailoring/comparison/dashboard/StatusBadge"

interface AtsCriteriaComparisonProps {
  criteria: ComparisonCriterionRow[]
}

const CRITERION_ICONS: Record<string, LucideIcon> = {
  title_match: Briefcase,
  vacancy_keywords: Search,
  required_skills: Wrench,
  language: Languages,
  recent_experience: Calendar,
  measurable_achievements: TrendingUp,
}

function CriteriaBar({
  value,
  variant,
  label,
}: {
  value: number
  variant: "current" | "adapted"
  label: string
}) {
  const color = variant === "current" ? "bg-indigo-500" : "bg-emerald-500"
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-sans text-[11px] text-muted-foreground">{label}</span>
        <span className="font-sans text-xs font-semibold tabular-nums">{value}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted/60"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value}%`}
      >
        <div
          className={`h-full rounded-full ${color} motion-safe:transition-all motion-safe:duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function AtsCriteriaComparison({ criteria }: AtsCriteriaComparisonProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison.dashboard")

  if (criteria.length === 0) return null

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm"
      aria-label={t("criteriaComparisonTitle")}
    >
      <div className="border-b border-border/70 bg-ats-arena/20 px-4 py-3.5 md:px-5">
        <h3 className="font-display text-base font-semibold text-foreground">
          {t("criteriaComparisonTitle")}
        </h3>
        <p className="mt-1 font-sans text-xs text-muted-foreground">{t("criteriaComparisonSubtitle")}</p>
      </div>

      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20">
              <th className="px-4 py-3 text-left font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:px-5">
                {t("criteriaColumn")}
              </th>
              <th className="px-4 py-3 text-left font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("currentColumn")}
              </th>
              <th className="px-4 py-3 text-left font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("adaptedColumn")}
              </th>
              <th className="px-4 py-3 text-left font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:px-5">
                {t("resultColumn")}
              </th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((row) => {
              const Icon = CRITERION_ICONS[row.id] ?? Search
              return (
                <tr key={row.id} className="border-b border-border/40 last:border-b-0">
                  <td className="px-4 py-4 md:px-5">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="font-sans text-sm font-medium text-foreground">
                        {t(row.labelKey)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <CriteriaBar value={row.currentValue} variant="current" label={t("currentColumn")} />
                  </td>
                  <td className="px-4 py-4">
                    <CriteriaBar value={row.adaptedValue} variant="adapted" label={t("adaptedColumn")} />
                  </td>
                  <td className="px-4 py-4 md:px-5">
                    {row.result === "pending" ? (
                      <StatusBadge tone="warning">{t("resultPending")}</StatusBadge>
                    ) : row.result === "tie" ? (
                      <StatusBadge tone="neutral">{t("resultTie")}</StatusBadge>
                    ) : row.result === "adapted" ? (
                      <StatusBadge tone="adapted">{t("resultAdapted")}</StatusBadge>
                    ) : (
                      <StatusBadge tone="current">{t("resultCurrent")}</StatusBadge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-4 p-4 md:hidden" role="list">
        {criteria.map((row) => {
          const Icon = CRITERION_ICONS[row.id] ?? Search
          return (
            <li key={row.id} className="rounded-xl border border-border/60 bg-muted/10 p-3.5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="font-sans text-sm font-medium">{t(row.labelKey)}</span>
                </div>
                {row.result === "pending" ? (
                  <StatusBadge tone="warning">{t("resultPending")}</StatusBadge>
                ) : row.result === "tie" ? (
                  <StatusBadge tone="neutral">{t("resultTie")}</StatusBadge>
                ) : row.result === "adapted" ? (
                  <StatusBadge tone="adapted">{t("resultAdapted")}</StatusBadge>
                ) : (
                  <StatusBadge tone="current">{t("resultCurrent")}</StatusBadge>
                )}
              </div>
              <div className="space-y-2.5">
                <CriteriaBar value={row.currentValue} variant="current" label={t("currentColumn")} />
                <CriteriaBar value={row.adaptedValue} variant="adapted" label={t("adaptedColumn")} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
