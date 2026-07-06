"use client"

import { useMemo } from "react"
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
import {
  computeAtsComplianceSummary,
  hasUnevaluatedAtsCriteria,
  isMinimumExperienceCriterion,
  resolveAtsComplianceSectionMode,
  shouldShowAtsGapChip,
  type AtsComplianceChecklistItem,
  type AtsComplianceStatus,
} from "@/lib/ats-compliance-checklist"

const STATUS_ICON: Record<AtsComplianceStatus, LucideIcon> = {
  Met: CheckCircle2,
  Partial: AlertTriangle,
  Missing: MinusCircle,
  NotApplicable: CircleDashed,
}

const CRITERION_ICON: Record<string, LucideIcon> = {
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

function statusBadgeClass(status: AtsComplianceStatus): string {
  switch (status) {
    case "Met":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "Partial":
      return "border-amber-500/35 bg-amber-500/12 text-amber-800 dark:text-amber-200"
    case "Missing":
      return "border-destructive/35 bg-destructive/10 text-destructive"
    case "NotApplicable":
      return "border-border/70 bg-muted/40 text-muted-foreground"
    default:
      return "border-border/70 bg-muted/40 text-muted-foreground"
  }
}

function gapChipClass(item: AtsComplianceChecklistItem): string {
  if (item.gapType === "RealGap") {
    return "border-destructive/30 bg-destructive/8 text-destructive"
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
}

interface AtsComplianceItemCardProps {
  item: AtsComplianceChecklistItem
  statusLabel: string
  writingGapLabel: string
  realGapLabel: string
  minimumExperienceTooltip: string
}

function AtsComplianceItemCard({
  item,
  statusLabel,
  writingGapLabel,
  realGapLabel,
  minimumExperienceTooltip,
}: AtsComplianceItemCardProps) {
  const StatusIcon = STATUS_ICON[item.status]
  const CriterionIcon = CRITERION_ICON[item.id] ?? FileText
  const showGapChip = shouldShowAtsGapChip(item)
  const gapLabel =
    item.gapType === "RealGap" ? realGapLabel : item.gapType === "WritingGap" ? writingGapLabel : null
  const isCollapsedNa = isMinimumExperienceCriterion(item) && item.status === "NotApplicable"

  const cardContent = (
    <article
      className={`rounded-xl border px-4 py-3.5 ${
        item.status === "NotApplicable"
          ? "border-border/50 bg-muted/15"
          : "border-border/70 bg-white shadow-sm"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              item.status === "Met"
                ? "bg-emerald-500/12 text-emerald-600"
                : item.status === "Partial"
                  ? "bg-amber-500/12 text-amber-600"
                  : item.status === "Missing"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
            }`}
            aria-hidden
          >
            <CriterionIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="font-sans text-sm font-semibold text-foreground">{item.label}</h4>
            {showGapChip && gapLabel ? (
              <span
                className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium ${gapChipClass(item)}`}
              >
                {gapLabel}
              </span>
            ) : null}
            {item.note.trim() ? (
              <p className="mt-2 max-w-prose font-sans text-sm leading-relaxed text-foreground/90">
                {item.note}
              </p>
            ) : null}
            {item.evidence && item.evidence.length > 0 ? (
              <ul className="mt-2.5 flex list-disc flex-col gap-1 pl-5 font-sans text-sm text-muted-foreground">
                {item.evidence.map((entry) => (
                  <li key={`${item.id}-${entry}`}>{entry}</li>
                ))}
              </ul>
            ) : null}
            {item.suggestedAction?.trim() ? (
              <p className="mt-2.5 rounded-lg border border-vo-purple/20 bg-vo-purple/5 px-3 py-2 font-sans text-xs leading-relaxed text-foreground/90">
                {item.suggestedAction}
              </p>
            ) : null}
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass(item.status)}`}
        >
          <StatusIcon className="h-3.5 w-3.5" aria-hidden />
          {statusLabel}
        </span>
      </div>
    </article>
  )

  if (!isCollapsedNa) {
    return cardContent
  }

  return (
    <details className="group rounded-xl border border-border/50 bg-muted/15">
      <summary className="cursor-pointer list-none px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              aria-hidden
            >
              <CriterionIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h4 className="font-sans text-sm font-semibold text-muted-foreground">{item.label}</h4>
              <p className="mt-0.5 font-sans text-xs text-muted-foreground">{minimumExperienceTooltip}</p>
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass(item.status)}`}
          >
            <StatusIcon className="h-3.5 w-3.5" aria-hidden />
            {statusLabel}
          </span>
        </div>
      </summary>
      {item.note.trim() ? (
        <div className="border-t border-border/50 px-4 py-3">
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">{item.note}</p>
        </div>
      ) : null}
    </details>
  )
}

export interface AtsComplianceChecklistProps {
  promptVersion: string | null
  checklist: AtsComplianceChecklistItem[]
}

export function AtsComplianceChecklist({ promptVersion, checklist }: AtsComplianceChecklistProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.atsCompliance")
  const mode = resolveAtsComplianceSectionMode(promptVersion, checklist)
  const summary = useMemo(() => computeAtsComplianceSummary(checklist), [checklist])
  const hasPartialEvaluation = useMemo(() => hasUnevaluatedAtsCriteria(checklist), [checklist])

  if (mode === "hidden") return null

  if (mode === "legacy") {
    return (
      <section
        className="rounded-2xl border border-border/80 bg-muted/20 px-4 py-4"
        aria-label={t("sectionAria")}
      >
        <p className="font-sans text-sm text-muted-foreground">{t("legacyMessage")}</p>
      </section>
    )
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm"
      aria-label={t("sectionAria")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-ats-arena/20 px-4 py-3.5">
        <h3 className="font-sans text-sm font-semibold text-foreground">{t("title")}</h3>
        {summary.total > 0 ? (
          <span className="inline-flex items-center rounded-full border border-vo-purple/25 bg-vo-purple/10 px-2.5 py-1 font-sans text-[11px] font-semibold text-vo-purple">
            {t("summary", { met: summary.met, total: summary.total })}
          </span>
        ) : null}
      </div>

      {hasPartialEvaluation ? (
        <div
          className="border-b border-amber-500/20 bg-amber-500/8 px-4 py-3 font-sans text-sm text-amber-900 dark:text-amber-100"
          role="status"
        >
          {t("partialEvaluationBanner")}
        </div>
      ) : null}

      <ul className="flex flex-col gap-3 p-4">
        {checklist.map((item) => (
          <li key={item.id}>
            <AtsComplianceItemCard
              item={item}
              statusLabel={t(`status.${item.status}`)}
              writingGapLabel={t("gapType.writingGap")}
              realGapLabel={t("gapType.realGap")}
              minimumExperienceTooltip={t("minimumExperienceTooltip")}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
