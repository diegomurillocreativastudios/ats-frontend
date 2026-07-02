"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Globe,
  MapPin,
  Sparkles,
  User,
} from "lucide-react"
import type { CandidateProfile } from "@/lib/candidate-profile"
import type { ProfileChangeHighlight } from "@/lib/candidate-profile-version"
import type { AtsComplianceChecklistItem } from "@/lib/ats-compliance-checklist"
import {
  deriveOpportunities,
  deriveStrengths,
  formatCandidateName,
  getCandidateInitials,
  getCategoryScores,
  getCompactExperienceItems,
  getPrimaryLanguageLevel,
  getProfileScoreEstimate,
  getTopSkillsForProfile,
  getExperienceStartYear,
  getYearsOfExperienceLabel,
  type ProfileComparisonVariant,
} from "@/lib/profile-comparison-helpers"
import { ScoreRing } from "@/components/candidato/profile-tailoring/comparison/dashboard/ScoreRing"
import { StatusBadge } from "@/components/candidato/profile-tailoring/comparison/dashboard/StatusBadge"
import { CategoryBars } from "@/components/candidato/profile-tailoring/comparison/dashboard/CategoryBars"
import { SkillChips } from "@/components/candidato/profile-tailoring/comparison/SkillChips"
import { EmptyValue } from "@/components/candidato/profile-tailoring/comparison/EmptyValue"

interface ProfileSummaryCardProps {
  profile: CandidateProfile
  referenceProfile: CandidateProfile
  variant: ProfileComparisonVariant
  estimatedMatchScore: number | null
  checklist: AtsComplianceChecklistItem[]
  changeHighlights: ProfileChangeHighlight[]
  sectionId: string
}

export function ProfileSummaryCard({
  profile,
  referenceProfile,
  variant,
  estimatedMatchScore,
  checklist,
  changeHighlights,
  sectionId,
}: ProfileSummaryCardProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison.dashboard")

  const categoryScores = useMemo(
    () => getCategoryScores(profile, checklist, variant, changeHighlights),
    [profile, checklist, variant, changeHighlights]
  )

  const score = useMemo(
    () => getProfileScoreEstimate(variant, estimatedMatchScore, checklist, changeHighlights),
    [variant, estimatedMatchScore, checklist, changeHighlights]
  )

  const strengths = useMemo(
    () => deriveStrengths(profile, variant, categoryScores),
    [profile, variant, categoryScores]
  )

  const opportunities = useMemo(
    () => deriveOpportunities(profile, variant, checklist, changeHighlights),
    [profile, variant, checklist, changeHighlights]
  )

  const topSkills = useMemo(
    () => getTopSkillsForProfile(profile, variant),
    [profile, variant]
  )

  const experienceItems = useMemo(() => getCompactExperienceItems(profile), [profile])
  const experienceStartYear = getExperienceStartYear(profile)
  const yearsLabel = getYearsOfExperienceLabel(profile)
  const englishLevel = getPrimaryLanguageLevel(profile, "ingl")

  const badgeTone = variant === "current" ? "current" : "adapted"
  const cardAccent =
    variant === "current"
      ? "border-indigo-500/20 bg-linear-to-b from-indigo-500/[0.04] to-white"
      : "border-emerald-500/20 bg-linear-to-b from-emerald-500/[0.05] to-white"

  return (
    <article
      id={sectionId}
      className={`flex flex-col gap-5 rounded-2xl border p-4 shadow-sm motion-safe:transition-shadow hover:shadow-md md:p-5 ${cardAccent}`}
    >
      <div className="flex items-start justify-between gap-3">
        <StatusBadge tone={badgeTone}>
          {variant === "current" ? t("currentBadge") : t("adaptedBadge")}
        </StatusBadge>
        <ScoreRing score={score} label={t("estimatedAlignment")} variant={variant} />
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
            variant === "current"
              ? "bg-indigo-500/12 text-indigo-700 dark:text-indigo-200"
              : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-200"
          }`}
          aria-hidden
        >
          {getCandidateInitials(profile)}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold text-foreground">
            {formatCandidateName(profile)}
          </h3>
          <p className="mt-0.5 font-sans text-sm font-medium text-foreground/90">
            {profile.headline.trim() || <EmptyValue message={t("noHeadline")} compact />}
          </p>
        </div>
      </div>

      <ul className="flex flex-wrap gap-2" role="list">
        {variant === "adapted" && yearsLabel ? (
          <li className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white/80 px-2.5 py-1.5 font-sans text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" aria-hidden />
            {t("yearsExperience", { years: yearsLabel })}
          </li>
        ) : null}
        {variant === "current" && experienceStartYear ? (
          <li className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white/80 px-2.5 py-1.5 font-sans text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" aria-hidden />
            {t("experienceSince", { year: experienceStartYear })}
          </li>
        ) : null}
        {profile.country ? (
          <li className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white/80 px-2.5 py-1.5 font-sans text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {profile.country}
          </li>
        ) : null}
        {englishLevel ? (
          <li className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white/80 px-2.5 py-1.5 font-sans text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" aria-hidden />
            {t("englishLevel", { level: englishLevel })}
          </li>
        ) : null}
      </ul>

      <CategoryBars categories={categoryScores} variant={variant} />

      <div>
        <h4 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("topSkills")}
        </h4>
        <SkillChips
          skills={topSkills}
          variant={variant === "current" ? "original" : "adapted"}
          referenceSkills={referenceProfile.skills}
          emptyMessage={t("noSkills")}
        />
      </div>

      {strengths.length > 0 ? (
        <div>
          <h4 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("strengthsTitle")}
          </h4>
          <ul className="grid gap-2 sm:grid-cols-2" role="list">
            {strengths.map((key) => (
              <li
                key={key}
                className="flex items-start gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                <span className="font-sans text-xs leading-relaxed text-foreground">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {opportunities.length > 0 ? (
        <div>
          <h4 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("opportunitiesTitle")}
          </h4>
          <ul className="grid gap-2 sm:grid-cols-2" role="list">
            {opportunities.map((key) => (
              <li
                key={key}
                className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                <span className="font-sans text-xs leading-relaxed text-foreground">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h4 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("recentExperience")}
        </h4>
        {experienceItems.length === 0 ? (
          <EmptyValue message={t("noExperience")} />
        ) : (
          <ol className="relative flex flex-col gap-0" role="list">
            {experienceItems.map((job, index) => (
              <li key={`${job.company}-${job.role}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                {index < experienceItems.length - 1 ? (
                  <span
                    className="absolute left-[9px] top-6 bottom-0 w-px bg-border/80"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={`relative z-1 mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
                    variant === "adapted"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-600"
                  }`}
                  aria-hidden
                >
                  {variant === "adapted" ? (
                    <Sparkles className="h-2.5 w-2.5" />
                  ) : (
                    <User className="h-2.5 w-2.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm font-semibold text-foreground">
                    {job.role || t("noRole")}
                  </p>
                  <p className="font-sans text-xs font-medium text-muted-foreground">
                    {[job.company, job.period].filter(Boolean).join(" · ")}
                  </p>
                  {variant === "adapted" && job.description ? (
                    <p className="mt-1 line-clamp-2 font-sans text-xs leading-relaxed text-foreground/80">
                      {job.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  )
}
