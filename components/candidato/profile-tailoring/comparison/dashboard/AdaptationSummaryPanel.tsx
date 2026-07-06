"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  FileText,
  Search,
  Sparkles,
  Target,
} from "lucide-react"
import type { ProfileChangeHighlight } from "@/lib/candidate-profile-version"
import type { AtsComplianceChecklistItem } from "@/lib/ats-compliance-checklist"
import {
  buildAdaptationConclusion,
  buildAdaptationInsights,
} from "@/lib/profile-comparison-helpers"
import { InsightCard } from "@/components/candidato/profile-tailoring/comparison/dashboard/InsightCard"

interface AdaptationSummaryPanelProps {
  vacancyTitle: string | null
  adaptationSummary: string | null
  changeHighlights: ProfileChangeHighlight[]
  checklist: AtsComplianceChecklistItem[]
}

const INSIGHT_ICONS = {
  vacancy: Target,
  headline: Sparkles,
  summary: FileText,
  keywords: Search,
  checklist: CheckCircle2,
  pending: AlertTriangle,
  "summary-fallback": FileText,
} as const

export function AdaptationSummaryPanel({
  vacancyTitle,
  adaptationSummary,
  changeHighlights,
  checklist,
}: AdaptationSummaryPanelProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison.dashboard")

  const insights = useMemo(
    () => buildAdaptationInsights(vacancyTitle, changeHighlights, checklist, adaptationSummary),
    [vacancyTitle, changeHighlights, checklist, adaptationSummary]
  )

  const conclusion = useMemo(
    () => buildAdaptationConclusion(adaptationSummary, checklist),
    [adaptationSummary, checklist]
  )

  const summary = useMemo(() => {
    const applicable = checklist.filter((item) => item.status !== "NotApplicable")
    const met = applicable.filter((item) => item.status === "Met").length
    return { met, total: applicable.length }
  }, [checklist])

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-sky-500/20 bg-linear-to-b from-sky-500/[0.05] via-white to-white p-4 shadow-sm md:p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/12 text-sky-600">
          <Briefcase className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">
            {t("adaptationSummaryTitle")}
          </h3>
          {summary.total > 0 ? (
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              {t("checklistProgress", { met: summary.met, total: summary.total })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {insights.map((insight) => {
          const Icon = INSIGHT_ICONS[insight.id as keyof typeof INSIGHT_ICONS] ?? Sparkles
          const tone =
            insight.id === "pending"
              ? "warning"
              : insight.id === "checklist"
                ? "success"
                : insight.id === "vacancy"
                  ? "info"
                  : "default"
          return (
            <InsightCard
              key={insight.id}
              icon={Icon}
              title={t(insight.titleKey)}
              value={insight.value}
              tone={tone}
            />
          )
        })}
      </div>

      <article className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4">
        <h4 className="font-sans text-sm font-semibold text-foreground">{t("conclusionTitle")}</h4>
        <p className="mt-2 font-sans text-sm leading-relaxed text-foreground/90">{conclusion}</p>
      </article>
    </article>
  )
}
