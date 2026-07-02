"use client"

import { useTranslations } from "next-intl"
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle2,
  CircleDashed,
  FileText,
  GraduationCap,
  Languages,
  MinusCircle,
  Search,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import type { AtsComplianceChecklistItem, AtsComplianceStatus } from "@/lib/ats-compliance-checklist"
import { shouldShowAtsGapChip } from "@/lib/ats-compliance-checklist"
import { mapAtsStatus } from "@/lib/profile-comparison-helpers"
import { StatusBadge } from "@/components/candidato/profile-tailoring/comparison/dashboard/StatusBadge"

interface AtsChecklistCardProps {
  checklist: AtsComplianceChecklistItem[]
}

const CRITERION_ICONS: Record<string, LucideIcon> = {
  readable_format: FileText,
  vacancy_keywords: Search,
  minimum_experience: Calendar,
  title_match: Briefcase,
  required_skills: Wrench,
  education_certifications_legal: GraduationCap,
  language: Languages,
  recent_experience: Calendar,
  measurable_achievements: TrendingUp,
}

const STATUS_ICON: Record<AtsComplianceStatus, LucideIcon> = {
  Met: CheckCircle2,
  Partial: AlertTriangle,
  Missing: MinusCircle,
  NotApplicable: CircleDashed,
}

function statusTone(status: AtsComplianceStatus): "adapted" | "warning" | "neutral" {
  const mapped = mapAtsStatus(status)
  if (mapped === "met") return "adapted"
  if (mapped === "missing" || mapped === "partial") return "warning"
  return "neutral"
}

export function AtsChecklistCard({ checklist }: AtsChecklistCardProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison.dashboard")
  const tAts = useTranslations("CandidatePortal.profileTailoring.atsCompliance")

  if (checklist.length === 0) return null

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm"
      aria-label={t("checklistTitle")}
    >
      <div className="border-b border-border/70 bg-ats-arena/20 px-4 py-3.5">
        <h3 className="font-display text-base font-semibold text-foreground">{t("checklistTitle")}</h3>
      </div>
      <ul className="flex flex-col gap-2 p-3" role="list">
        {checklist.map((item) => {
          const Icon = CRITERION_ICONS[item.id] ?? FileText
          const StatusIcon = STATUS_ICON[item.status]
          const isHighlighted =
            item.id === "measurable_achievements" &&
            (item.status === "Missing" || item.status === "Partial")
          const showGap = shouldShowAtsGapChip(item)

          return (
            <li key={item.id}>
              <article
                className={`rounded-xl border px-3 py-2.5 ${
                  isHighlighted
                    ? "border-amber-500/35 bg-amber-500/8 ring-1 ring-amber-500/20"
                    : item.status === "NotApplicable"
                      ? "border-border/50 bg-muted/15"
                      : "border-border/60 bg-white"
                }`}
                title={item.note || undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isHighlighted
                          ? "bg-amber-500/12 text-amber-600"
                          : item.status === "Met"
                            ? "bg-emerald-500/12 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                      }`}
                      aria-hidden
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-medium text-foreground">{item.label}</p>
                      {showGap ? (
                        <p className="mt-0.5 font-sans text-[11px] text-amber-700 dark:text-amber-200">
                          {item.gapType === "RealGap"
                            ? tAts("gapType.realGap")
                            : tAts("gapType.writingGap")}
                        </p>
                      ) : null}
                      {item.suggestedAction?.trim() && isHighlighted ? (
                        <p className="mt-1 font-sans text-[11px] leading-relaxed text-muted-foreground">
                          {item.suggestedAction}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge tone={statusTone(item.status)}>
                    <StatusIcon className="mr-1 h-3 w-3" aria-hidden />
                    {tAts(`status.${item.status}`)}
                  </StatusBadge>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
