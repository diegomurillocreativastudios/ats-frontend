"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Target } from "lucide-react"
import type { CandidateProfile } from "@/lib/candidate-profile"
import type { ProfileChangeHighlight } from "@/lib/candidate-profile-version"
import type { AtsComplianceChecklistItem } from "@/lib/ats-compliance-checklist"
import { resolveAtsComplianceSectionMode } from "@/lib/ats-compliance-checklist"
import {
  buildComparisonCriteria,
  resolveVacancyDisplayTitle,
} from "@/lib/profile-comparison-helpers"
import { AiDisclosureBadge } from "@/components/rrhh/AiDisclosure"
import { ProfileSummaryCard } from "@/components/candidato/profile-tailoring/comparison/dashboard/ProfileSummaryCard"
import { AdaptationSummaryPanel } from "@/components/candidato/profile-tailoring/comparison/dashboard/AdaptationSummaryPanel"
import { AtsCriteriaComparison } from "@/components/candidato/profile-tailoring/comparison/dashboard/AtsCriteriaComparison"
import { AtsChecklistCard } from "@/components/candidato/profile-tailoring/comparison/dashboard/AtsChecklistCard"
import { ChangeHighlightsDiff } from "@/components/candidato/profile-tailoring/comparison/dashboard/ChangeHighlightsDiff"
import { ComparisonActions } from "@/components/candidato/profile-tailoring/comparison/dashboard/ComparisonActions"

export interface ProfileComparisonPanelProps {
  currentProfile: CandidateProfile
  adaptedProfile: CandidateProfile
  adaptationSummary: string | null
  changeHighlights: ProfileChangeHighlight[]
  estimatedMatchScore: number | null
  vacancyTitle?: string | null
  promptVersion?: string | null
  atsComplianceChecklist?: AtsComplianceChecklistItem[]
  onViewOriginal?: () => void
  onViewAdapted?: () => void
  onApplyAdapted?: () => void
  onExportComparison?: () => void
  applying?: boolean
  showActions?: boolean
}

export function ProfileComparisonPanel({
  currentProfile,
  adaptedProfile,
  adaptationSummary,
  changeHighlights,
  estimatedMatchScore,
  vacancyTitle,
  promptVersion = null,
  atsComplianceChecklist = [],
  onViewOriginal,
  onViewAdapted,
  onApplyAdapted,
  onExportComparison,
  applying = false,
  showActions = false,
}: ProfileComparisonPanelProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison")
  const tDashboard = useTranslations("CandidatePortal.profileTailoring.comparison.dashboard")
  const tAts = useTranslations("CandidatePortal.profileTailoring.atsCompliance")

  const resolvedVacancyTitle = useMemo(
    () => resolveVacancyDisplayTitle(vacancyTitle, adaptedProfile, changeHighlights),
    [vacancyTitle, adaptedProfile, changeHighlights]
  )

  const criteria = useMemo(
    () =>
      buildComparisonCriteria(
        currentProfile,
        adaptedProfile,
        atsComplianceChecklist,
        changeHighlights
      ),
    [currentProfile, adaptedProfile, atsComplianceChecklist, changeHighlights]
  )

  const atsMode = resolveAtsComplianceSectionMode(promptVersion, atsComplianceChecklist)
  const hasChanges = changeHighlights.length > 0
  const hasSummary = Boolean(adaptationSummary?.trim())

  const handleViewOriginal =
    onViewOriginal ??
    (() => {
      document.getElementById("profile-comparison-current")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })

  const handleViewAdapted =
    onViewAdapted ??
    (() => {
      document.getElementById("profile-comparison-adapted")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })

  return (
    <section className="flex flex-col gap-5 md:gap-6" aria-labelledby="profile-comparison-heading">
      <header className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-white via-ats-arena/35 to-sky-500/6 p-5 shadow-sm md:p-6">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              id="profile-comparison-heading"
              className="font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl"
            >
              {t("title")}
            </h2>
            <AiDisclosureBadge label={t("adaptedBadge")} />
          </div>
          <p className="max-w-3xl font-sans text-sm leading-relaxed text-muted-foreground">
            {tDashboard("subtitle")}
          </p>
          <p className="inline-flex max-w-full items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-1.5 font-sans text-sm font-medium text-foreground">
            <Target className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
            <span className="text-muted-foreground">{tDashboard("targetVacancyLabel")}</span>
            <span className="truncate">
              {resolvedVacancyTitle ?? tDashboard("targetVacancyFallback")}
            </span>
          </p>
          {estimatedMatchScore == null ? (
            <p className="font-sans text-xs text-muted-foreground">{tDashboard("estimatedScoreNote")}</p>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_0.72fr_minmax(0,1fr)]">
        <div className="order-2 xl:order-1">
          <ProfileSummaryCard
            profile={currentProfile}
            referenceProfile={adaptedProfile}
            variant="current"
            estimatedMatchScore={estimatedMatchScore}
            checklist={atsComplianceChecklist}
            changeHighlights={changeHighlights}
            sectionId="profile-comparison-current"
          />
        </div>

        <div className="order-1 md:col-span-2 xl:order-2 xl:col-span-1">
          {(hasSummary || hasChanges || atsComplianceChecklist.length > 0) && (
            <AdaptationSummaryPanel
              vacancyTitle={resolvedVacancyTitle}
              adaptationSummary={adaptationSummary}
              changeHighlights={changeHighlights}
              checklist={atsComplianceChecklist}
            />
          )}
        </div>

        <div className="order-3 md:col-span-2 xl:col-span-1">
          <ProfileSummaryCard
            profile={adaptedProfile}
            referenceProfile={currentProfile}
            variant="adapted"
            estimatedMatchScore={estimatedMatchScore}
            checklist={atsComplianceChecklist}
            changeHighlights={changeHighlights}
            sectionId="profile-comparison-adapted"
          />
        </div>
      </div>

      {criteria.length > 0 ? <AtsCriteriaComparison criteria={criteria} /> : null}

      {atsMode === "checklist" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <ChangeHighlightsDiff changeHighlights={changeHighlights} />
          <AtsChecklistCard checklist={atsComplianceChecklist} />
        </div>
      ) : (
        <ChangeHighlightsDiff changeHighlights={changeHighlights} />
      )}

      {atsMode === "legacy" ? (
        <section
          className="rounded-2xl border border-border/80 bg-muted/20 px-4 py-4"
          aria-label={tAts("sectionAria")}
        >
          <p className="font-sans text-sm text-muted-foreground">{tAts("legacyMessage")}</p>
        </section>
      ) : null}

      {showActions ? (
        <ComparisonActions
          onViewOriginal={handleViewOriginal}
          onViewAdapted={handleViewAdapted}
          onApplyAdapted={onApplyAdapted}
          onExportComparison={onExportComparison}
          applying={applying}
          showApply={Boolean(onApplyAdapted)}
        />
      ) : null}
    </section>
  )
}
