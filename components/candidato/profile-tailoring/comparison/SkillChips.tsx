"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, ChevronUp } from "lucide-react"
import { EmptyValue } from "@/components/candidato/profile-tailoring/comparison/EmptyValue"
import {
  normalizeSkillsList,
  type ProfileColumnVariant,
} from "@/components/candidato/profile-tailoring/comparison/comparison-utils"

const VISIBLE_LIMIT = 12

interface SkillChipsProps {
  skills: unknown
  variant: ProfileColumnVariant
  referenceSkills?: unknown
  emptyMessage: string
}

export function SkillChips({ skills, variant, referenceSkills, emptyMessage }: SkillChipsProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison")
  const [expanded, setExpanded] = useState(false)
  const flat = normalizeSkillsList(skills)
  const referenceSet = useMemo(
    () => new Set(normalizeSkillsList(referenceSkills).map((s) => s.toLowerCase())),
    [referenceSkills]
  )

  if (flat.length === 0) {
    return <EmptyValue message={emptyMessage} />
  }

  const visibleSkills = expanded ? flat : flat.slice(0, VISIBLE_LIMIT)
  const hiddenCount = flat.length - VISIBLE_LIMIT

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2" role="list">
        {visibleSkills.map((skill, index) => {
          const isNew =
            variant === "adapted" && !referenceSet.has(skill.toLowerCase())
          return (
            <li
              key={`${skill.slice(0, 40)}-${index}`}
              className={`max-w-full rounded-full px-3 py-1.5 font-sans text-xs font-medium motion-safe:transition-colors ${
                isNew
                  ? "border border-vo-purple/30 bg-vo-purple/12 text-vo-purple"
                  : variant === "adapted"
                    ? "border border-border/60 bg-white text-foreground"
                    : "border border-border/60 bg-muted/40 text-foreground"
              }`}
            >
              {skill}
            </li>
          )
        })}
      </ul>
      {flat.length > VISIBLE_LIMIT ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-md font-sans text-xs font-medium text-vo-purple underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              {t("skillsShowLess")}
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              {t("skillsShowMore", { count: hiddenCount })}
            </>
          )}
        </button>
      ) : null}
    </div>
  )
}
