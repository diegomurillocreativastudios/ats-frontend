"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Briefcase } from "lucide-react"
import { EmptyValue } from "@/components/candidato/profile-tailoring/comparison/EmptyValue"
import {
  normalizeObjectArray,
  type ProfileColumnVariant,
} from "@/components/candidato/profile-tailoring/comparison/comparison-utils"

interface ExperienceTimelineProps {
  items: unknown
  variant: ProfileColumnVariant
  referenceItems?: unknown
  emptyMessage: string
}

const str = (value: unknown) => (value == null ? "" : String(value).trim())

export function ExperienceTimeline({
  items,
  variant,
  referenceItems,
  emptyMessage,
}: ExperienceTimelineProps) {
  const t = useTranslations("CandidatePortal.profileTailoring.comparison")
  const list = normalizeObjectArray(items ?? [])
  const referenceList = useMemo(() => normalizeObjectArray(referenceItems ?? []), [referenceItems])

  if (list.length === 0) {
    return <EmptyValue message={emptyMessage} />
  }

  return (
    <ol className="relative flex flex-col gap-0" role="list">
      {list.map((job, index) => {
        const company = str(job.Company ?? job.company)
        const role = str(job.Role ?? job.role)
        const start = str(job.StartDate ?? job.startDate)
        const end = str(job.EndDate ?? job.endDate)
        const desc = str(job.Description ?? job.description)
        const period = [start, end].filter(Boolean).join(" — ")
        const refJob = referenceList[index]
        const refDesc = refJob ? str(refJob.Description ?? refJob.description) : ""
        const isEnhanced =
          variant === "adapted" && desc && refDesc && desc !== refDesc

        return (
          <li key={`${company}-${role}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
            {index < list.length - 1 ? (
              <span
                className="absolute left-[11px] top-7 bottom-0 w-px bg-border/80"
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-[1] mt-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border ${
                isEnhanced
                  ? "border-vo-purple/40 bg-vo-purple/12 text-vo-purple"
                  : "border-border bg-white text-muted-foreground"
              }`}
              aria-hidden
            >
              <Briefcase className="h-3 w-3" />
            </span>
            <div
              className={`min-w-0 flex-1 rounded-xl border p-3.5 motion-safe:transition-shadow motion-safe:duration-200 ${
                isEnhanced
                  ? "border-vo-purple/20 bg-vo-purple/[0.03]"
                  : "border-border/70 bg-muted/20"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-sans text-sm font-semibold text-foreground">
                    {role || <EmptyValue message={emptyMessage} compact />}
                  </p>
                  {company ? (
                    <p className="mt-0.5 font-sans text-sm font-medium text-vo-purple">{company}</p>
                  ) : null}
                </div>
                {period ? (
                  <time className="shrink-0 font-sans text-xs text-muted-foreground">{period}</time>
                ) : null}
              </div>
              {desc ? (
                <p className="mt-2.5 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/85">
                  {desc}
                </p>
              ) : null}
              {isEnhanced ? (
                <p className="mt-2 font-sans text-[11px] font-medium text-vo-purple">
                  {t("experienceEnhanced")}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
