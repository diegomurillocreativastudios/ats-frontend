"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Sparkles, User } from "lucide-react"
import type { CandidateProfile } from "@/lib/candidate-profile"
import type { ProfileChangeHighlight } from "@/lib/candidate-profile-version"
import { CandidateProfileSectionsProvider } from "@/components/rrhh/CandidateProfileSections"
import { ComparisonHeader } from "@/components/candidato/profile-tailoring/comparison/ComparisonHeader"
import { ComparisonColumnHeader } from "@/components/candidato/profile-tailoring/comparison/ComparisonColumnHeader"
import { ChangeConnector } from "@/components/candidato/profile-tailoring/comparison/ChangeConnector"
import { ProfileSectionCard } from "@/components/candidato/profile-tailoring/comparison/ProfileSectionCard"
import { ComparisonInsights } from "@/components/candidato/profile-tailoring/comparison/ComparisonInsights"
import {
  formatMatchScore,
  resolveHighlightedSections,
  type ProfileColumnVariant,
} from "@/components/candidato/profile-tailoring/comparison/comparison-utils"
import {
  useComparisonSections,
  type ComparisonSectionDef,
} from "@/components/candidato/profile-tailoring/comparison/use-comparison-sections"

type MobileColumn = "original" | "adapted"

interface ComparisonColumnProps {
  profile: CandidateProfile
  referenceProfile: CandidateProfile
  sections: ComparisonSectionDef[]
  variant: ProfileColumnVariant
  highlightedSections: Set<string>
  columnLabel: string
  changedLabel: string
  emptyLabel: string
  yesLabel: string
  noLabel: string
}

function ComparisonColumn({
  profile,
  referenceProfile,
  sections,
  variant,
  highlightedSections,
  columnLabel,
  changedLabel,
  emptyLabel,
  yesLabel,
  noLabel,
}: ComparisonColumnProps) {
  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">
        {columnLabel}
      </p>
      {sections.map((section) => {
        const isHighlighted = variant === "adapted" && highlightedSections.has(section.id)
        return (
          <ProfileSectionCard
            key={`${section.id}-${variant}`}
            title={section.title}
            icon={section.icon}
            sectionId={`${section.sectionDomId}-${variant}`}
            variant={variant}
            isHighlighted={isHighlighted}
            changedLabel={changedLabel}
          >
            {section.render(profile, {
              variant,
              referenceProfile: variant === "adapted" ? referenceProfile : undefined,
              emptyLabel,
              yesLabel,
              noLabel,
            })}
          </ProfileSectionCard>
        )
      })}
    </div>
  )
}

interface ProfileComparisonRowProps {
  section: ComparisonSectionDef
  currentProfile: CandidateProfile
  adaptedProfile: CandidateProfile
  isHighlighted: boolean
  changedLabel: string
  emptyLabel: string
  yesLabel: string
  noLabel: string
}

function ProfileComparisonRow({
  section,
  currentProfile,
  adaptedProfile,
  isHighlighted,
  changedLabel,
  emptyLabel,
  yesLabel,
  noLabel,
}: ProfileComparisonRowProps) {
  return (
    <div
      className="grid grid-cols-1 items-stretch gap-3 border-b border-border/40 pb-5 last:border-b-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-5"
      role="group"
      aria-label={section.title}
    >
      <ProfileSectionCard
        title={section.title}
        icon={section.icon}
        sectionId={`${section.sectionDomId}-original`}
        variant="original"
      >
        {section.render(currentProfile, {
          variant: "original",
          emptyLabel,
          yesLabel,
          noLabel,
        })}
      </ProfileSectionCard>

      <ChangeConnector isHighlighted={isHighlighted} />

      <ProfileSectionCard
        title={section.title}
        icon={section.icon}
        sectionId={`${section.sectionDomId}-adapted`}
        variant="adapted"
        isHighlighted={isHighlighted}
        changedLabel={changedLabel}
      >
        {section.render(adaptedProfile, {
          variant: "adapted",
          referenceProfile: currentProfile,
          emptyLabel,
          yesLabel,
          noLabel,
        })}
      </ProfileSectionCard>
    </div>
  )
}

export interface ProfileComparisonPanelProps {
  currentProfile: CandidateProfile
  adaptedProfile: CandidateProfile
  adaptationSummary: string | null
  changeHighlights: ProfileChangeHighlight[]
  estimatedMatchScore: number | null
  vacancyTitle?: string | null
}

export function ProfileComparisonPanel({
  currentProfile,
  adaptedProfile,
  adaptationSummary,
  changeHighlights,
  estimatedMatchScore,
  vacancyTitle,
}: ProfileComparisonPanelProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison")
  const tProfile = useTranslations("CandidatePortal.profile")
  const sections = useComparisonSections()
  const scoreLabel = formatMatchScore(estimatedMatchScore)
  const [mobileColumn, setMobileColumn] = useState<MobileColumn>("adapted")

  const highlightedSections = useMemo(
    () => resolveHighlightedSections(changeHighlights),
    [changeHighlights]
  )
  const hasInsights = Boolean(adaptationSummary) || changeHighlights.length > 0

  const renderOptions = {
    emptyLabel: t("emptyValue"),
    yesLabel: tProfile("values.yes"),
    noLabel: tProfile("values.no"),
    changedLabel: t("sectionChanged"),
  }

  const mobileTabClass = (tab: MobileColumn) =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-sans text-sm font-medium motion-safe:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 ${
      mobileColumn === tab
        ? tab === "adapted"
          ? "bg-vo-purple/15 text-vo-purple shadow-sm"
          : "bg-muted text-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    }`

  return (
    <CandidateProfileSectionsProvider namespace="CandidatePortal.profile">
      <section
        className="flex flex-col gap-5 md:gap-6"
        aria-labelledby="profile-comparison-heading"
      >
        <ComparisonHeader vacancyTitle={vacancyTitle} scoreLabel={scoreLabel} />

        <div
          className="overflow-hidden rounded-2xl border border-border/80 bg-linear-to-b from-white to-ats-arena/30 shadow-sm"
          role="group"
          aria-label={t("splitAria")}
        >
          <div className="sticky top-0 z-10 border-b border-border/70 bg-white/95 px-3 py-3 backdrop-blur-md md:px-4">
            <div
              className="mb-3 flex gap-2 lg:hidden"
              role="tablist"
              aria-label={t("mobileTabsAria")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={mobileColumn === "original"}
                className={mobileTabClass("original")}
                onClick={() => setMobileColumn("original")}
              >
                <User className="h-4 w-4" aria-hidden />
                {t("mobileTabInitial")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileColumn === "adapted"}
                className={mobileTabClass("adapted")}
                onClick={() => setMobileColumn("adapted")}
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {t("mobileTabAdapted")}
              </button>
            </div>

            <div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-5 lg:grid">
              <ComparisonColumnHeader
                title={t("currentTitle")}
                badge={t("initialBadge")}
                variant="original"
              />
              <div aria-hidden />
              <ComparisonColumnHeader
                title={t("adaptedTitle")}
                badge={t("adaptedBadge")}
                variant="adapted"
              />
            </div>
          </div>

          <div className="p-3 md:p-4 lg:p-5">
            <div className="lg:hidden" role="tabpanel">
              {mobileColumn === "original" ? (
                <ComparisonColumn
                  profile={currentProfile}
                  referenceProfile={adaptedProfile}
                  sections={sections}
                  variant="original"
                  highlightedSections={highlightedSections}
                  columnLabel={t("currentTitle")}
                  {...renderOptions}
                />
              ) : (
                <ComparisonColumn
                  profile={adaptedProfile}
                  referenceProfile={currentProfile}
                  sections={sections}
                  variant="adapted"
                  highlightedSections={highlightedSections}
                  columnLabel={t("adaptedTitle")}
                  {...renderOptions}
                />
              )}
            </div>

            <div className="hidden flex-col gap-5 lg:flex">
              {sections.map((section) => (
                <ProfileComparisonRow
                  key={section.id}
                  section={section}
                  currentProfile={currentProfile}
                  adaptedProfile={adaptedProfile}
                  isHighlighted={highlightedSections.has(section.id)}
                  {...renderOptions}
                />
              ))}
            </div>
          </div>
        </div>

        {hasInsights ? (
          <ComparisonInsights
            adaptationSummary={adaptationSummary}
            changeHighlights={changeHighlights}
          />
        ) : null}
      </section>
    </CandidateProfileSectionsProvider>
  )
}
