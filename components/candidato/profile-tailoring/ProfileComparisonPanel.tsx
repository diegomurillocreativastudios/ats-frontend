"use client"

import { useMemo, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { ArrowRight, Sparkles, User } from "lucide-react"
import type { CandidateProfile } from "@/lib/candidate-profile"
import type { ProfileChangeHighlight } from "@/lib/candidate-profile-version"
import {
  CandidateProfileSectionsProvider,
  SectionCard,
  InfoGrid,
  JobPreferencesBlock,
  WorkExperienceList,
  EducationList,
  LanguagesList,
  SkillsCloud,
  SocialLinksList,
  ReferencesList,
  RecognitionsList,
} from "@/components/rrhh/CandidateProfileSections"
import { resolveHeadlineForDisplay } from "@/lib/candidate-profile-hydrate"
import { formatBirthDateForDisplay } from "@/lib/candidate-profile"
import { resolveCountryDisplay } from "@/lib/normalizeCountryDisplay"
import { formatPhoneSvDisplay } from "@/lib/formatPhoneSv"
import { emptyToDash } from "@/components/rrhh/CandidateProfileSections"

type ProfileColumnVariant = "original" | "adapted"

type ProfileSectionId =
  | "hero"
  | "contact"
  | "personal"
  | "prefs"
  | "work"
  | "edu"
  | "lang"
  | "skills"
  | "links"
  | "refs"
  | "recog"

interface ComparisonSectionDef {
  id: ProfileSectionId
  title: string
  sectionDomId: string
  render: (profile: CandidateProfile) => ReactNode
}

function formatMatchScore(score: number | null | undefined): string | null {
  if (score == null || Number.isNaN(score)) return null
  const percent = score <= 1 ? Math.round(score * 100) : Math.round(score)
  return `${percent}%`
}

function resolveHighlightedSections(highlights: ProfileChangeHighlight[]): Set<ProfileSectionId> {
  const sections = new Set<ProfileSectionId>()
  for (const item of highlights) {
    const field = item.field.toLowerCase()
    if (
      field.includes("headline") ||
      field.includes("titular") ||
      field.includes("summary") ||
      field.includes("resumen")
    ) {
      sections.add("hero")
    }
    if (field.includes("email") || field.includes("phone") || field.includes("teléfono") || field.includes("contacto")) {
      sections.add("contact")
    }
    if (
      field.includes("country") ||
      field.includes("país") ||
      field.includes("birth") ||
      field.includes("nacimiento")
    ) {
      sections.add("personal")
    }
    if (
      field.includes("job") ||
      field.includes("preference") ||
      field.includes("preferencia") ||
      field.includes("salary") ||
      field.includes("salario") ||
      field.includes("sector")
    ) {
      sections.add("prefs")
    }
    if (field.includes("work") || field.includes("experiencia") || field.includes("experience")) {
      sections.add("work")
    }
    if (field.includes("education") || field.includes("educación") || field.includes("formación")) {
      sections.add("edu")
    }
    if (field.includes("language") || field.includes("idioma")) {
      sections.add("lang")
    }
    if (field.includes("skill") || field.includes("habilidad") || field.includes("competencia")) {
      sections.add("skills")
    }
    if (field.includes("social") || field.includes("link") || field.includes("video")) {
      sections.add("links")
    }
    if (field.includes("reference") || field.includes("referencia")) {
      sections.add("refs")
    }
    if (field.includes("recognition") || field.includes("reconocimiento") || field.includes("logro")) {
      sections.add("recog")
    }
  }
  return sections
}

function useComparisonSections(): ComparisonSectionDef[] {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison")
  const tProfile = useTranslations("CandidatePortal.profile")

  return useMemo(
    () => [
      {
        id: "hero",
        title: t("panel.hero"),
        sectionDomId: "tailor-compare-hero",
        render: (profile) => {
          const headline = resolveHeadlineForDisplay(profile)
          return (
            <InfoGrid
              items={[
                { label: t("panel.headline"), value: emptyToDash(headline) },
                { label: t("panel.summary"), value: emptyToDash(profile.summary) },
              ]}
            />
          )
        },
      },
      {
        id: "contact",
        title: t("panel.contact"),
        sectionDomId: "tailor-compare-contact",
        render: (profile) => (
          <InfoGrid
            items={[
              { label: tProfile("fields.email"), value: emptyToDash(profile.email) },
              {
                label: tProfile("fields.phone"),
                value: emptyToDash(formatPhoneSvDisplay(profile.phoneNumber)),
              },
            ]}
          />
        ),
      },
      {
        id: "personal",
        title: tProfile("groups.accountPersonal"),
        sectionDomId: "tailor-compare-personal",
        render: (profile) => (
          <InfoGrid
            items={[
              {
                label: tProfile("fields.country"),
                value: emptyToDash(resolveCountryDisplay(profile.country, profile.phoneNumber)),
              },
              {
                label: tProfile("fields.birthDate"),
                value: emptyToDash(formatBirthDateForDisplay(profile.birthDate)),
              },
            ]}
          />
        ),
      },
      {
        id: "prefs",
        title: tProfile("sections.jobPreferences"),
        sectionDomId: "tailor-compare-prefs",
        render: (profile) => <JobPreferencesBlock prefs={profile.jobPreferences} />,
      },
      {
        id: "work",
        title: tProfile("sections.workExperience"),
        sectionDomId: "tailor-compare-work",
        render: (profile) => <WorkExperienceList items={profile.workExperience} />,
      },
      {
        id: "edu",
        title: tProfile("sections.education"),
        sectionDomId: "tailor-compare-edu",
        render: (profile) => <EducationList items={profile.education} />,
      },
      {
        id: "lang",
        title: tProfile("sections.languages"),
        sectionDomId: "tailor-compare-lang",
        render: (profile) => <LanguagesList items={profile.languages} />,
      },
      {
        id: "skills",
        title: tProfile("sections.skills"),
        sectionDomId: "tailor-compare-skills",
        render: (profile) => <SkillsCloud skills={profile.skills} />,
      },
      {
        id: "links",
        title: tProfile("sections.links"),
        sectionDomId: "tailor-compare-links",
        render: (profile) => <SocialLinksList links={profile.socialLinks} />,
      },
      {
        id: "refs",
        title: tProfile("sections.references"),
        sectionDomId: "tailor-compare-refs",
        render: (profile) => <ReferencesList items={profile.references} />,
      },
      {
        id: "recog",
        title: tProfile("sections.recognitions"),
        sectionDomId: "tailor-compare-recog",
        render: (profile) => <RecognitionsList items={profile.recognitions} />,
      },
    ],
    [t, tProfile]
  )
}

interface ProfileComparisonCellProps {
  profile: CandidateProfile
  section: ComparisonSectionDef
  variant: ProfileColumnVariant
  columnLabel: string
  isHighlighted: boolean
}

function ProfileComparisonCell({
  profile,
  section,
  variant,
  columnLabel,
  isHighlighted,
}: ProfileComparisonCellProps) {
  const shellClass =
    variant === "original"
      ? "border-border bg-muted/20"
      : "border-vo-purple/30 bg-vo-purple/[0.04]"

  const highlightClass = isHighlighted ? "ring-2 ring-vo-purple/25" : ""

  return (
    <div
      className={`flex h-full min-w-0 flex-col rounded-xl border p-3 md:p-4 ${shellClass} ${highlightClass}`}
    >
      <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">
        {columnLabel}
      </p>
      <div className="min-h-0 flex-1 [&>section]:h-full [&>section]:border-0 [&>section]:bg-transparent [&>section]:p-0 [&>section]:shadow-none">
        <SectionCard title={section.title} sectionId={`${section.sectionDomId}-${variant}`}>
          {section.render(profile)}
        </SectionCard>
      </div>
    </div>
  )
}

interface ProfileComparisonRowProps {
  section: ComparisonSectionDef
  currentProfile: CandidateProfile
  adaptedProfile: CandidateProfile
  isHighlighted: boolean
  initialLabel: string
  adaptedLabel: string
}

function ProfileComparisonRow({
  section,
  currentProfile,
  adaptedProfile,
  isHighlighted,
  initialLabel,
  adaptedLabel,
}: ProfileComparisonRowProps) {
  return (
    <div
      className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4"
      role="group"
      aria-label={section.title}
    >
      <ProfileComparisonCell
        profile={currentProfile}
        section={section}
        variant="original"
        columnLabel={initialLabel}
        isHighlighted={false}
      />

      <div className="hidden items-center justify-center lg:flex" aria-hidden>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      </div>

      <ProfileComparisonCell
        profile={adaptedProfile}
        section={section}
        variant="adapted"
        columnLabel={adaptedLabel}
        isHighlighted={isHighlighted}
      />
    </div>
  )
}

interface ComparisonColumnHeaderProps {
  title: string
  badge: string
  variant: ProfileColumnVariant
}

function ComparisonColumnHeader({ title, badge, variant }: ComparisonColumnHeaderProps) {
  const Icon = variant === "original" ? User : Sparkles
  const shellClass =
    variant === "original"
      ? "border-border bg-muted/40"
      : "border-vo-purple/30 bg-vo-purple/10"
  const badgeClass =
    variant === "original"
      ? "bg-background text-muted-foreground"
      : "bg-vo-purple/15 text-vo-purple"
  const iconShellClass =
    variant === "original"
      ? "bg-background text-muted-foreground"
      : "bg-vo-purple/15 text-vo-purple"

  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 ${shellClass}`}
    >
      <span
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconShellClass}`}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-foreground">
        {title}
      </p>
      <span className={`shrink-0 rounded-full px-2 py-0.5 font-sans text-[10px] font-medium ${badgeClass}`}>
        {badge}
      </span>
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
  const sections = useComparisonSections()
  const scoreLabel = formatMatchScore(estimatedMatchScore)
  const highlightedSections = useMemo(
    () => resolveHighlightedSections(changeHighlights),
    [changeHighlights]
  )
  const hasInsights = Boolean(adaptationSummary) || changeHighlights.length > 0

  return (
    <CandidateProfileSectionsProvider namespace="CandidatePortal.profile">
      <section className="flex flex-col gap-6" aria-labelledby="profile-comparison-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2
              id="profile-comparison-heading"
              className="font-sans text-lg font-semibold text-foreground"
            >
              {t("title")}
            </h2>
            <p className="mt-1 font-sans text-sm text-muted-foreground">{t("subtitle")}</p>
            {vacancyTitle ? (
              <p className="mt-1 font-sans text-sm font-medium text-foreground">
                {t("vacancyContext", { title: vacancyTitle })}
              </p>
            ) : null}
          </div>
          {scoreLabel ? (
            <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-vo-purple/30 bg-vo-purple/5 px-4 py-2.5">
              <Sparkles className="h-4 w-4 text-vo-purple" aria-hidden />
              <p className="font-sans text-sm font-semibold text-foreground">
                {t("estimatedScore", { score: scoreLabel })}
              </p>
            </div>
          ) : null}
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-border bg-card"
          role="group"
          aria-label={t("splitAria")}
        >
          <div className="sticky top-0 z-10 grid grid-cols-1 gap-2 border-b border-border bg-card/95 px-3 py-3 backdrop-blur-sm lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4 lg:px-4">
            <ComparisonColumnHeader
              title={t("currentTitle")}
              badge={t("initialBadge")}
              variant="original"
            />
            <div className="hidden lg:block" aria-hidden />
            <ComparisonColumnHeader
              title={t("adaptedTitle")}
              badge={t("adaptedBadge")}
              variant="adapted"
            />
          </div>

          <div className="flex flex-col gap-4 p-3 md:gap-5 md:p-4">
            {sections.map((section) => (
              <ProfileComparisonRow
                key={section.id}
                section={section}
                currentProfile={currentProfile}
                adaptedProfile={adaptedProfile}
                isHighlighted={highlightedSections.has(section.id)}
                initialLabel={t("currentTitle")}
                adaptedLabel={t("adaptedTitle")}
              />
            ))}
          </div>
        </div>

        {hasInsights ? (
          <details className="group rounded-2xl border border-border bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-vo-purple" aria-hidden />
                {t("insightsToggle")}
              </span>
            </summary>
            <div className="space-y-4 border-t border-border px-4 py-4">
              {adaptationSummary ? (
                <article className="rounded-xl border border-border bg-muted/30 p-4">
                  <h3 className="font-sans text-sm font-semibold text-foreground">
                    {t("summaryTitle")}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap font-sans text-sm text-foreground">
                    {adaptationSummary}
                  </p>
                </article>
              ) : null}

              {changeHighlights.length > 0 ? (
                <article className="rounded-xl border border-border bg-muted/30 p-4">
                  <h3 className="font-sans text-sm font-semibold text-foreground">
                    {t("highlightsTitle")}
                  </h3>
                  <ul className="mt-3 flex flex-col gap-3">
                    {changeHighlights.map((item) => (
                      <li
                        key={`${item.field}-${item.before}-${item.after}`}
                        className="rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <p className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.field}
                        </p>
                        <p className="mt-1 font-sans text-sm text-foreground">
                          <span className="text-muted-foreground line-through decoration-muted-foreground/60">
                            {item.before || "—"}
                          </span>
                          {" → "}
                          <span className="font-medium text-vo-purple">{item.after || "—"}</span>
                        </p>
                        {item.reason ? (
                          <p className="mt-1 font-sans text-xs text-muted-foreground">{item.reason}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}
            </div>
          </details>
        ) : null}
      </section>
    </CandidateProfileSectionsProvider>
  )
}
