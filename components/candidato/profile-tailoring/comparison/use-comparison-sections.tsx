"use client"

import { useMemo, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import {
  Award,
  Briefcase,
  GraduationCap,
  Languages,
  Link2,
  Mail,
  User,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { CandidateProfile } from "@/lib/candidate-profile"
import { formatBirthDateForDisplay } from "@/lib/candidate-profile"
import { resolveHeadlineForDisplay } from "@/lib/candidate-profile-hydrate"
import { resolveCountryDisplay } from "@/lib/normalizeCountryDisplay"
import { formatPhoneSvDisplay } from "@/lib/formatPhoneSv"
import { EditorialField, FieldGrid } from "@/components/candidato/profile-tailoring/comparison/FieldGrid"
import { ExperienceTimeline } from "@/components/candidato/profile-tailoring/comparison/ExperienceTimeline"
import { SkillChips } from "@/components/candidato/profile-tailoring/comparison/SkillChips"
import { EmptyValue } from "@/components/candidato/profile-tailoring/comparison/EmptyValue"
import {
  normalizeObjectArray,
  parseJsonObjectIfString,
  type ProfileColumnVariant,
  type ProfileSectionId,
} from "@/components/candidato/profile-tailoring/comparison/comparison-utils"
import { ExternalLink, Phone } from "lucide-react"

export interface ComparisonSectionDef {
  id: ProfileSectionId
  title: string
  sectionDomId: string
  icon: LucideIcon
  render: (
    profile: CandidateProfile,
    options: ComparisonRenderOptions
  ) => ReactNode
}

export interface ComparisonRenderOptions {
  variant: ProfileColumnVariant
  referenceProfile?: CandidateProfile
  emptyLabel: string
  yesLabel: string
  noLabel: string
}

function ComparisonJobPreferences({
  prefs,
  options,
}: {
  prefs: unknown
  options: ComparisonRenderOptions
}) {
  const tProfile = useTranslations("CandidatePortal.profile")
  const parsed = parseJsonObjectIfString(prefs) as Record<string, unknown> | null
  const sectors = Array.isArray(parsed?.Sectors) ? parsed.Sectors : []
  const sectorsText = sectors.length > 0 ? sectors.join(", ") : null

  const items = [
    { label: tProfile("fields.desiredRole"), value: parsed?.DesiredRole ?? parsed?.desiredRole },
    { label: tProfile("fields.minSalary"), value: parsed?.MinSalary ?? parsed?.minSalary },
    {
      label: tProfile("fields.educationLevel"),
      value: parsed?.EducationLevel ?? parsed?.educationLevel,
    },
    { label: tProfile("fields.desiredCity"), value: parsed?.DesiredCity ?? parsed?.desiredCity },
    { label: tProfile("fields.availability"), value: parsed?.Availability ?? parsed?.availability },
    {
      label: tProfile("fields.disability"),
      value:
        parsed?.Disability === true || parsed?.disability === true
          ? options.yesLabel
          : parsed?.Disability === false || parsed?.disability === false
            ? options.noLabel
            : null,
    },
  ]

  const hasAny =
    Boolean(sectorsText) || items.some((row) => row.value != null && String(row.value).trim() !== "")

  if (!hasAny) {
    return <EmptyValue message={options.emptyLabel} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {tProfile("fields.sectors")}
        </p>
        <p className="mt-1 font-sans text-sm text-foreground">
          {sectorsText ?? <EmptyValue message={options.emptyLabel} compact />}
        </p>
      </div>
      <FieldGrid items={items} emptyLabel={options.emptyLabel} />
    </div>
  )
}

function ComparisonEducationList({
  items,
  emptyMessage,
}: {
  items: unknown
  emptyMessage: string
}) {
  const list = normalizeObjectArray(items ?? [])
  if (list.length === 0) {
    return <EmptyValue message={emptyMessage} />
  }

  return (
    <ul className="flex flex-col gap-2.5" role="list">
      {list.map((edu, index) => {
        const institution = String(edu.Institution ?? edu.institution ?? "")
        const degree = String(edu.Degree ?? edu.degree ?? "")
        const start = String(edu.StartDate ?? edu.startDate ?? "")
        const end = String(edu.EndDate ?? edu.endDate ?? "")
        const period = [start, end].filter(Boolean).join(" — ")
        return (
          <li
            key={`${institution}-${degree}-${index}`}
            className="rounded-xl border border-border/70 bg-muted/15 px-3.5 py-3"
          >
            <p className="font-sans text-sm font-semibold text-foreground">
              {degree || <EmptyValue message={emptyMessage} compact />}
            </p>
            {institution ? (
              <p className="mt-0.5 font-sans text-sm text-muted-foreground">{institution}</p>
            ) : null}
            {period ? (
              <p className="mt-1.5 font-sans text-xs text-muted-foreground">{period}</p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function ComparisonLanguagesList({
  items,
  emptyMessage,
  variant,
}: {
  items: unknown
  emptyMessage: string
  variant: ProfileColumnVariant
}) {
  const list = normalizeObjectArray(items ?? [])
  if (list.length === 0) {
    return <EmptyValue message={emptyMessage} />
  }

  return (
    <ul className="flex flex-wrap gap-2" role="list">
      {list.map((lang, index) => {
        const name = String(lang.Language ?? lang.language ?? "")
        const level = String(lang.Level ?? lang.level ?? "")
        const label = [name, level].filter(Boolean).join(" · ")
        return (
          <li
            key={`${name}-${index}`}
            className={`rounded-full border px-3 py-1.5 font-sans text-xs font-medium ${
              variant === "adapted"
                ? "border-vo-purple/25 bg-vo-purple/10 text-vo-purple"
                : "border-border/70 bg-muted/30 text-foreground"
            }`}
          >
            {label || <EmptyValue message={emptyMessage} compact />}
          </li>
        )
      })}
    </ul>
  )
}

function ComparisonSocialLinks({
  links,
  emptyMessage,
  linkPlatformFallback,
}: {
  links: unknown
  emptyMessage: string
  linkPlatformFallback: string
}) {
  const normalizeUrl = (url: unknown) => {
    if (!url || typeof url !== "string") return null
    const trimmed = url.trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  if (!Array.isArray(links) || links.length === 0) {
    return <EmptyValue message={emptyMessage} />
  }

  return (
    <ul className="flex flex-col gap-2" role="list">
      {links.map((link, index) => {
        const item = link as Record<string, unknown>
        const platform = String(item.Platform ?? item.platform ?? linkPlatformFallback)
        const rawUrl = item.Url ?? item.url ?? ""
        const href = normalizeUrl(rawUrl)
        return (
          <li key={`${platform}-${index}`}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 font-sans text-sm text-vo-purple underline-offset-2 motion-safe:transition-colors hover:border-vo-purple/30 hover:bg-vo-purple/5 hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
              >
                <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{platform}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              </a>
            ) : (
              <span className="font-sans text-sm text-foreground">
                {platform}: <EmptyValue message={emptyMessage} compact />
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ComparisonReferencesList({
  items,
  emptyMessage,
}: {
  items: unknown
  emptyMessage: string
}) {
  const list = normalizeObjectArray(items ?? [])
  if (list.length === 0) {
    return <EmptyValue message={emptyMessage} />
  }

  return (
    <ul className="flex flex-col gap-2.5" role="list">
      {list.map((ref, index) => {
        const name = String(ref.Name ?? ref.name ?? "")
        const position = String(ref.Position ?? ref.position ?? "")
        const company = String(ref.Company ?? ref.company ?? "")
        const contact = String(ref.Contact ?? ref.contact ?? "")
        return (
          <li
            key={`${name}-${index}`}
            className="rounded-xl border border-border/70 bg-muted/15 px-3.5 py-3"
          >
            <p className="font-sans text-sm font-semibold text-foreground">
              {name || <EmptyValue message={emptyMessage} compact />}
            </p>
            {(position || company) && (
              <p className="mt-0.5 font-sans text-sm text-muted-foreground">
                {[position, company].filter(Boolean).join(" · ")}
              </p>
            )}
            {contact ? (
              <p className="mt-2 flex items-center gap-1.5 font-sans text-sm text-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {contact}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function ComparisonRecognitionsList({
  items,
  emptyMessage,
}: {
  items: unknown
  emptyMessage: string
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return <EmptyValue message={emptyMessage} />
  }

  return (
    <ul className="flex flex-col gap-2" role="list">
      {items.map((r, i) => (
        <li
          key={i}
          className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 font-sans text-sm text-foreground"
        >
          <Award className="mt-0.5 h-3.5 w-3.5 shrink-0 text-vo-purple/70" aria-hidden />
          <span>{typeof r === "string" ? r : JSON.stringify(r)}</span>
        </li>
      ))}
    </ul>
  )
}

export function useComparisonSections(): ComparisonSectionDef[] {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison")
  const tProfile = useTranslations("CandidatePortal.profile")

  return useMemo(
    () => [
      {
        id: "hero",
        title: t("panel.hero"),
        sectionDomId: "tailor-compare-hero",
        icon: User,
        render: (profile, options) => {
          const headline = resolveHeadlineForDisplay(profile)
          return (
            <div className="flex flex-col gap-5">
              <EditorialField
                label={t("panel.headline")}
                value={headline}
                emptyLabel={options.emptyLabel}
                variant={options.variant}
                emphasize
              />
              <EditorialField
                label={t("panel.summary")}
                value={profile.summary}
                emptyLabel={options.emptyLabel}
                variant={options.variant}
              />
            </div>
          )
        },
      },
      {
        id: "contact",
        title: t("panel.contact"),
        sectionDomId: "tailor-compare-contact",
        icon: Mail,
        render: (profile, options) => (
          <FieldGrid
            items={[
              { label: tProfile("fields.email"), value: profile.email },
              {
                label: tProfile("fields.phone"),
                value: formatPhoneSvDisplay(profile.phoneNumber),
              },
            ]}
            emptyLabel={options.emptyLabel}
          />
        ),
      },
      {
        id: "personal",
        title: tProfile("groups.accountPersonal"),
        sectionDomId: "tailor-compare-personal",
        icon: UserCircle,
        render: (profile, options) => (
          <FieldGrid
            items={[
              {
                label: tProfile("fields.country"),
                value: resolveCountryDisplay(profile.country, profile.phoneNumber),
              },
              {
                label: tProfile("fields.birthDate"),
                value: formatBirthDateForDisplay(profile.birthDate),
              },
            ]}
            emptyLabel={options.emptyLabel}
          />
        ),
      },
      {
        id: "prefs",
        title: tProfile("sections.jobPreferences"),
        sectionDomId: "tailor-compare-prefs",
        icon: Briefcase,
        render: (profile, options) => (
          <ComparisonJobPreferences prefs={profile.jobPreferences} options={options} />
        ),
      },
      {
        id: "work",
        title: tProfile("sections.workExperience"),
        sectionDomId: "tailor-compare-work",
        icon: Briefcase,
        render: (profile, options) => (
          <ExperienceTimeline
            items={profile.workExperience}
            variant={options.variant}
            referenceItems={options.referenceProfile?.workExperience}
            emptyMessage={tProfile("emptyStates.noWorkExperience")}
          />
        ),
      },
      {
        id: "edu",
        title: tProfile("sections.education"),
        sectionDomId: "tailor-compare-edu",
        icon: GraduationCap,
        render: (profile, options) => (
          <ComparisonEducationList
            items={profile.education}
            emptyMessage={tProfile("emptyStates.noEducation")}
          />
        ),
      },
      {
        id: "lang",
        title: tProfile("sections.languages"),
        sectionDomId: "tailor-compare-lang",
        icon: Languages,
        render: (profile, options) => (
          <ComparisonLanguagesList
            items={profile.languages}
            emptyMessage={options.emptyLabel}
            variant={options.variant}
          />
        ),
      },
      {
        id: "skills",
        title: tProfile("sections.skills"),
        sectionDomId: "tailor-compare-skills",
        icon: Wrench,
        render: (profile, options) => (
          <SkillChips
            skills={profile.skills}
            variant={options.variant}
            referenceSkills={options.referenceProfile?.skills}
            emptyMessage={options.emptyLabel}
          />
        ),
      },
      {
        id: "links",
        title: tProfile("sections.links"),
        sectionDomId: "tailor-compare-links",
        icon: Link2,
        render: (profile, options) => (
          <ComparisonSocialLinks
            links={profile.socialLinks}
            emptyMessage={options.emptyLabel}
            linkPlatformFallback={tProfile("fallbacks.linkPlatform")}
          />
        ),
      },
      {
        id: "refs",
        title: tProfile("sections.references"),
        sectionDomId: "tailor-compare-refs",
        icon: Users,
        render: (profile, options) => (
          <ComparisonReferencesList
            items={profile.references}
            emptyMessage={tProfile("emptyStates.noReferences")}
          />
        ),
      },
      {
        id: "recog",
        title: tProfile("sections.recognitions"),
        sectionDomId: "tailor-compare-recog",
        icon: Award,
        render: (profile, options) => (
          <ComparisonRecognitionsList
            items={profile.recognitions}
            emptyMessage={tProfile("emptyStates.noRecognitions")}
          />
        ),
      },
    ],
    [t, tProfile]
  )
}
